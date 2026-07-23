import Docker from "dockerode";
import { env } from "../config/env.js";

const DEFAULT_SOCKET_PATH =
  process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";

const docker = new Docker({
  socketPath: env.DOCKER_SOCKET_PATH || DEFAULT_SOCKET_PATH,
});

export interface RunContainerOptions {
  image: string;
  cmd: string[];
  files: Record<string, string>;
  stdin?: string;
  timeLimitMs: number;
  memoryLimitKb: number;
}

export interface RunContainerResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  oomKilled: boolean;
  durationMs: number;
}

// Caps how much stdout/stderr we ever hold in memory — a runaway program
// shouldn't be able to exhaust server memory just because it hasn't hit
// its wall-clock timeout yet.
const MAX_OUTPUT_BYTES = 1_000_000;

// The container's own main process never does real work — it just keeps
// the container (and its namespaces/mounts) alive so we can `exec` into it.
const HOLDING_CMD = ["sleep", "infinity"];

interface ExecResult {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number | null;
}

// Docker's stream-multiplexing frame format for a non-Tty attach/exec:
// 1 byte stream type (1=stdout, 2=stderr) + 3 reserved bytes + 4-byte
// big-endian payload length + that many payload bytes, repeating.
function demuxRaw(raw: Buffer): { stdout: Buffer; stderr: Buffer } {
  const stdoutParts: Buffer[] = [];
  const stderrParts: Buffer[] = [];
  let offset = 0;
  while (offset + 8 <= raw.length) {
    const streamType = raw[offset];
    const length = raw.readUInt32BE(offset + 4);
    const payload = raw.subarray(offset + 8, offset + 8 + length);
    if (streamType === 2) stderrParts.push(payload);
    else stdoutParts.push(payload);
    offset += 8 + length;
  }
  return { stdout: Buffer.concat(stdoutParts), stderr: Buffer.concat(stderrParts) };
}

// attachStdin should only be true for the LAST exec run against a given
// container. On this Docker Desktop setup, an exec that receives non-empty
// stdin via stream.end(content) leaves the hijacked connection in a state
// that hangs the *next* exec on the same container — harmless here since
// the real run step (the only one that needs real stdin) is always last.
//
// Output is collected as one raw buffer and demuxed only after the stream
// has completely ended, rather than demultiplexing incrementally as chunks
// arrive (via dockerode's own demuxStream) — piping chunk-by-chunk into
// separate stdout/stderr writables raced against the stream's own
// end/close events on this transport, occasionally losing the last chunk.
async function execAndCollect(
  container: Docker.Container,
  cmd: string[],
  options: { attachStdin: boolean; stdin?: string },
): Promise<ExecResult> {
  const exec = await container.exec({
    Cmd: cmd,
    WorkingDir: "/workspace",
    AttachStdin: options.attachStdin,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
  });

  const rawChunks: Buffer[] = [];
  let totalBytes = 0;

  const stream = await exec.start({ hijack: true, stdin: options.attachStdin, Tty: false });
  stream.on("data", (chunk: Buffer) => {
    if (totalBytes < MAX_OUTPUT_BYTES) {
      rawChunks.push(chunk);
      totalBytes += chunk.length;
    }
  });

  // Waiting for 'end' alone occasionally races ahead of the daemon
  // finalizing the exec's exit state; 'close' confirms the connection is
  // fully torn down before we call inspect().
  const streamDone = new Promise<void>((resolve) => {
    let ended = false;
    let closed = false;
    const maybeResolve = () => {
      if (ended && closed) resolve();
    };
    stream.on("end", () => {
      ended = true;
      maybeResolve();
    });
    stream.on("close", () => {
      closed = true;
      maybeResolve();
    });
  });
  if (options.attachStdin) stream.end(options.stdin ?? "");
  await streamDone;

  const exitCode = await waitForExecExit(exec);
  const { stdout, stderr } = demuxRaw(Buffer.concat(rawChunks));
  return { stdout, stderr, exitCode };
}

// Even after the stream reports 'end'+'close', the daemon has occasionally
// not yet finalized the exec's own exit state (ExitCode still null,
// Running still true) — poll briefly rather than trust a single inspect().
async function waitForExecExit(exec: Docker.Exec): Promise<number | null> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const inspectResult = await exec.inspect();
    if (!inspectResult.Running) return inspectResult.ExitCode ?? null;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return null;
}

// Writes one file into /workspace via a base64-encoded command-line
// argument rather than piping it through stdin (see execAndCollect above
// for why) — decoded and redirected entirely inside the container, so the
// content is never exposed as a shell string that could be reinterpreted.
async function writeFileInContainer(
  container: Docker.Container,
  name: string,
  content: string,
): Promise<void> {
  const encoded = Buffer.from(content, "utf-8").toString("base64");
  await execAndCollect(container, ["sh", "-c", 'echo "$1" | base64 -d > "$2"', "sh", encoded, name], {
    attachStdin: false,
  });
}

async function readFileInContainer(container: Docker.Container, path: string): Promise<Buffer> {
  const result = await execAndCollect(container, ["cat", path], { attachStdin: false });
  return result.stdout;
}

// Every sandboxed run: create (held open via a no-op main process) -> exec
// in each source file via `cat` (not the Docker cp/putArchive API, which
// Docker refuses outright for any ReadonlyRootfs container even when the
// target path is itself a writable tmpfs) -> exec the real command, racing
// it against the timeout -> inspect for OOM -> remove in finally no matter
// what happened above.
export async function runContainer(options: RunContainerOptions): Promise<RunContainerResult> {
  const { image, cmd, files, stdin = "", timeLimitMs, memoryLimitKb } = options;
  const memoryBytes = memoryLimitKb * 1024;

  const container = await docker.createContainer({
    Image: image,
    Cmd: HOLDING_CMD,
    WorkingDir: "/workspace",
    User: "judge",
    Tty: false,
    NetworkDisabled: true,
    HostConfig: {
      Memory: memoryBytes,
      // Docker defaults MemorySwap to 2x Memory if left unset, which would
      // silently let a process swap instead of actually hitting the limit.
      MemorySwap: memoryBytes,
      NanoCpus: 1_000_000_000, // 1 CPU
      PidsLimit: 64, // fork-bomb defense
      NetworkMode: "none",
      ReadonlyRootfs: true,
      // Deliberately nosuid but NOT noexec — the compiled binary (C/C++/Java
      // runners, added later) must be executable from this scratch dir.
      // mode=1777 so the non-root `judge` user can write here.
      Tmpfs: { "/workspace": "rw,nosuid,mode=1777,size=64m" },
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
      AutoRemove: false,
    },
  });

  const startedAt = Date.now();
  let timedOut = false;
  let stdout: Buffer = Buffer.alloc(0);
  let stderr: Buffer = Buffer.alloc(0);
  let exitCode: number | null = null;

  try {
    await container.start();

    for (const [name, content] of Object.entries(files)) {
      await writeFileInContainer(container, name, content);
    }

    // The real command's own stdout/stderr are redirected to files inside
    // the container rather than captured live off the exec's attach
    // stream — on this transport, live capture of a fast-exiting process's
    // output has proven to occasionally lose data (see execAndCollect).
    // A shell redirect is flushed by the time the process exits, so
    // reading the files back afterward (via the same reliable no-stdin
    // exec pattern used for writing files) is authoritative. "$@" (not a
    // string-interpolated command) so cmd's own arguments are never
    // reinterpreted as shell syntax.
    const wrappedCmd = [
      "sh",
      "-c",
      '"$@" > /workspace/.stdout 2> /workspace/.stderr; echo -n $? > /workspace/.exitcode',
      "sh",
      ...cmd,
    ];
    const runPromise = execAndCollect(container, wrappedCmd, { attachStdin: true, stdin });
    let timeoutHandle!: NodeJS.Timeout;
    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timeoutHandle = setTimeout(() => resolve("timeout"), timeLimitMs);
    });

    try {
      const raceResult = await Promise.race([runPromise, timeoutPromise]);
      if (raceResult === "timeout") {
        timedOut = true;
        await container.kill().catch(() => {
          // container may have exited in the gap between the race
          // resolving and this kill() call — not an error worth surfacing
        });
      }
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!timedOut) {
      stdout = await readFileInContainer(container, "/workspace/.stdout");
      stderr = await readFileInContainer(container, "/workspace/.stderr");
      const exitCodeText = (await readFileInContainer(container, "/workspace/.exitcode"))
        .toString("utf-8")
        .trim();
      const parsedExitCode = Number.parseInt(exitCodeText, 10);
      exitCode = Number.isNaN(parsedExitCode) ? null : parsedExitCode;
    }

    const inspectResult = await container.inspect();

    return {
      stdout: stdout.toString("utf-8"),
      stderr: stderr.toString("utf-8"),
      exitCode,
      timedOut,
      oomKilled: inspectResult.State.OOMKilled,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    await container.remove({ force: true }).catch(() => {});
  }
}
