import type { Job } from "bullmq";
import type { Verdict } from "@online-judge/shared";
import type { SubmitJobData } from "../../queue/queues.js";
import { prisma } from "../../db/prisma.js";
import { runCode } from "../../judge/runCode.js";
import { computeVerdict } from "../../judge/verdict.js";
import { logger } from "../../lib/logger.js";

const COMPILE_ERROR_MAX_CHARS = 4000;

// A worse-first ordering so the overall submission verdict reflects the
// first meaningfully-informative failure rather than just "the last test
// case run" — matches how most judges report "Wrong answer on test 3" etc.
const VERDICT_PRIORITY: Verdict[] = [
  "COMPILE_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "RUNTIME_ERROR",
  "WRONG_ANSWER",
  "ACCEPTED",
];

export async function processSubmitJob(job: Job<SubmitJobData>): Promise<void> {
  const { submissionId } = job.data;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      problem: {
        include: { testCases: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!submission) {
    logger.error({ submissionId }, "Submit job for missing submission");
    return;
  }

  await prisma.submission.update({ where: { id: submissionId }, data: { verdict: "RUNNING" } });

  const testCases = submission.problem.testCases;
  const perCaseVerdicts: Verdict[] = [];
  let maxRuntimeMs = 0;
  let compileErrorMessage: string | null = null;

  // Deliberately re-compiles per test case rather than compiling once and
  // reusing the binary across all of them — simpler and correct, at the
  // cost of some redundant compile time for compiled languages. A
  // reasonable future optimization, not required for correctness.
  for (const testCase of testCases) {
    const result = await runCode(
      submission.language,
      submission.code,
      testCase.input,
      submission.problem.timeLimitMs,
      submission.problem.memoryLimitKb,
    );
    const verdict = computeVerdict(result, testCase.expectedOutput);
    perCaseVerdicts.push(verdict);

    await prisma.testCaseResult.create({
      data: {
        submissionId,
        testCaseId: testCase.id,
        orderIndex: testCase.orderIndex,
        verdict,
        runtimeMs: result.compileError === null ? result.durationMs : null,
        // Peak-memory tracking (container.stats() polling) isn't wired up
        // yet — MLE enforcement itself doesn't depend on it (that's
        // OOMKilled), this would only be informational display.
        memoryKb: null,
      },
    });

    if (result.durationMs > maxRuntimeMs) maxRuntimeMs = result.durationMs;

    if (verdict === "COMPILE_ERROR") {
      compileErrorMessage = result.compileError?.slice(0, COMPILE_ERROR_MAX_CHARS) ?? null;
      break; // same code, same compiler — every remaining case would fail identically
    }
  }

  const passedCount = perCaseVerdicts.filter((v) => v === "ACCEPTED").length;
  const overallVerdict =
    perCaseVerdicts.length === 0
      ? "INTERNAL_ERROR"
      : VERDICT_PRIORITY.find((v) => perCaseVerdicts.includes(v))!;

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      verdict: overallVerdict,
      errorMessage: compileErrorMessage,
      runtimeMs: perCaseVerdicts.length > 0 ? maxRuntimeMs : null,
      memoryKb: null,
      passedCount,
      totalCount: testCases.length,
    },
  });
}
