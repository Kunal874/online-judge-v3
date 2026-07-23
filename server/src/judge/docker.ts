import Docker from "dockerode";
import { env } from "../config/env.js";

const DEFAULT_SOCKET_PATH =
  process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";

const docker = new Docker({
  socketPath: env.DOCKER_SOCKET_PATH || DEFAULT_SOCKET_PATH,
});

export interface RunContainerOptions {
  image: string;
  // If set, run this first. Non-zero exit (or timeout) short-circuits with
  // compileError set and the real command never runs.
  compileCmd?: string[];
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
  // Non-null means compilation failed and nothing else ran — every other
  // field is a default/placeholder in that case, not a real observation.
  compileError: string | null;
}

// Independent of the problem's own memory limit — compilers are memory-
// hungry and shouldn't be constrained by the problem's runtime budget.
const COMPILE_MEMORY_LIMIT_KB = 524_288; // 512MB
const COMPILE_TIME_LIMIT_MS = 15_000;
const COMPILE_STDERR_MAX_CHARS = 4000;

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

interface TimedCommandResult {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number | null;
  timedOut: boolean;
}

// Runs one command with its real stdout/stderr/exit code redirected to
// files (see execAndCollect's comment for why), racing it against
// timeLimitMs and killing the container if it fires. Shared by both the
// compile phase and the real run phase — same redirect-then-read-back
// pattern, just different commands/timeouts/stdin.
async function runCommandWithTimeout(
  container: Docker.Container,
  cmd: string[],
  stdin: string,
  timeLimitMs: number,
): Promise<TimedCommandResult> {
  // "$@" (not a string-interpolated command) so cmd's own arguments are
  // never reinterpreted as shell syntax.
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

  let timedOut = false;
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

  if (timedOut) {
    return { stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), exitCode: null, timedOut: true };
  }

  const stdout = await readFileInContainer(container, "/workspace/.stdout");
  const stderr = await readFileInContainer(container, "/workspace/.stderr");
  const exitCodeText = (await readFileInContainer(container, "/workspace/.exitcode"))
    .toString("utf-8")
    .trim();
  const parsedExitCode = Number.parseInt(exitCodeText, 10);
  return {
    stdout,
    stderr,
    exitCode: Number.isNaN(parsedExitCode) ? null : parsedExitCode,
    timedOut: false,
  };
}

// Every sandboxed run: create (held open via a no-op main process) -> exec
// in each source file via `cat` (not the Docker cp/putArchive API, which
// Docker refuses outright for any ReadonlyRootfs container even when the
// target path is itself a writable tmpfs) -> optionally compile -> exec
// the real command, racing it against the timeout -> inspect for OOM ->
// remove in finally no matter what happened above.
export async function runContainer(options: RunContainerOptions): Promise<RunContainerResult> {
  const { image, compileCmd, cmd, files, stdin = "", timeLimitMs, memoryLimitKb } = options;
  const runMemoryBytes = memoryLimitKb * 1024;
  // Start with the generous compile budget if there's a compile step —
  // tightened to the problem's real limit after compilation succeeds, so
  // the compiler itself is never constrained by a strict problem memory
  // limit meant for the user's running program.
  const initialMemoryBytes = compileCmd ? COMPILE_MEMORY_LIMIT_KB * 1024 : runMemoryBytes;

  const container = await docker.createContainer({
    Image: image,
    Cmd: HOLDING_CMD,
    WorkingDir: "/workspace",
    User: "judge",
    Tty: false,
    NetworkDisabled: true,
    HostConfig: {
      Memory: initialMemoryBytes,
      // Docker defaults MemorySwap to 2x Memory if left unset, which would
      // silently let a process swap instead of actually hitting the limit.
      MemorySwap: initialMemoryBytes,
      NanoCpus: 1_000_000_000, // 1 CPU
      PidsLimit: 64, // fork-bomb defense
      NetworkMode: "none",
      ReadonlyRootfs: true,
      // Deliberately nosuid but explicitly `exec` (not the docker default
      // for a HostConfig.Tmpfs mount, confirmed by testing — omitting it
      // makes every file here non-executable regardless of its own
      // permission bits) — a compiled binary must be executable from this
      // scratch dir. mode=1777 so the non-root `judge` user can write here.
      Tmpfs: { "/workspace": "rw,exec,nosuid,mode=1777,size=64m" },
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
      AutoRemove: false,
    },
  });

  const startedAt = Date.now();

  try {
    await container.start();

    for (const [name, content] of Object.entries(files)) {
      await writeFileInContainer(container, name, content);
    }

    if (compileCmd) {
      const compileResult = await runCommandWithTimeout(container, compileCmd, "", COMPILE_TIME_LIMIT_MS);
      if (compileResult.timedOut) {
        return {
          stdout: "",
          stderr: "",
          exitCode: null,
          timedOut: false,
          oomKilled: false,
          durationMs: Date.now() - startedAt,
          compileError: "Compilation timed out.",
        };
      }
      if (compileResult.exitCode !== 0) {
        return {
          stdout: "",
          stderr: "",
          exitCode: null,
          timedOut: false,
          oomKilled: false,
          durationMs: Date.now() - startedAt,
          compileError: compileResult.stderr.toString("utf-8").slice(0, COMPILE_STDERR_MAX_CHARS),
        };
      }
      // Compilation succeeded — now apply the problem's real memory limit
      // before running untrusted code against real input.
      await container.update({ Memory: runMemoryBytes, MemorySwap: runMemoryBytes });
    }

    const runResult = await runCommandWithTimeout(container, cmd, stdin, timeLimitMs);
    const inspectResult = await container.inspect();

    return {
      stdout: runResult.stdout.toString("utf-8"),
      stderr: runResult.stderr.toString("utf-8"),
      exitCode: runResult.exitCode,
      timedOut: runResult.timedOut,
      oomKilled: inspectResult.State.OOMKilled,
      durationMs: Date.now() - startedAt,
      compileError: null,
    };
  } finally {
    await container.remove({ force: true }).catch(() => {});
  }
}
