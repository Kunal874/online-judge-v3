import type { Job } from "bullmq";
import type { RunResult } from "@online-judge/shared";
import type { RunJobData } from "../../queue/queues.js";
import { runPython } from "../../judge/runPython.js";

export async function processRunJob(job: Job<RunJobData>): Promise<RunResult> {
  const { language, code, stdin, timeLimitMs, memoryLimitKb } = job.data;

  // Only Python is wired up so far — C/C++/Java land in a later milestone.
  if (language !== "PYTHON") {
    throw new Error(`Language ${language} is not supported yet`);
  }

  const result = await runPython(code, stdin, timeLimitMs, memoryLimitKb);
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    oomKilled: result.oomKilled,
    durationMs: result.durationMs,
  };
}
