import type { Job } from "bullmq";
import type { RunResult } from "@online-judge/shared";
import type { RunJobData } from "../../queue/queues.js";
import { runCode } from "../../judge/runCode.js";

export async function processRunJob(job: Job<RunJobData>): Promise<RunResult> {
  const { language, code, stdin, timeLimitMs, memoryLimitKb } = job.data;

  const result = await runCode(language, code, stdin, timeLimitMs, memoryLimitKb);
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    oomKilled: result.oomKilled,
    durationMs: result.durationMs,
    compileError: result.compileError,
  };
}
