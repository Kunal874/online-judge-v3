import { prisma } from "../../db/prisma.js";
import { submitQueue } from "../../queue/queues.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";
import type { CreateSubmissionInput, SubmissionListQuery } from "@online-judge/shared";
import type { Role } from "../../generated/prisma/enums.js";

const SUMMARY_SELECT = {
  id: true,
  problemId: true,
  language: true,
  verdict: true,
  passedCount: true,
  totalCount: true,
  createdAt: true,
  problem: { select: { title: true, slug: true } },
} as const;

function toSummary(row: {
  id: string;
  problemId: string;
  language: string;
  verdict: string;
  passedCount: number;
  totalCount: number;
  createdAt: Date;
  problem: { title: string; slug: string };
}) {
  return {
    id: row.id,
    problemId: row.problemId,
    problemTitle: row.problem.title,
    problemSlug: row.problem.slug,
    language: row.language,
    verdict: row.verdict,
    passedCount: row.passedCount,
    totalCount: row.totalCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createSubmission(
  userId: string,
  problemId: string,
  input: CreateSubmissionInput,
) {
  const problem = await prisma.problem.findFirst({ where: { id: problemId, isPublished: true } });
  if (!problem) throw new NotFoundError("Problem not found");

  const submission = await prisma.submission.create({
    data: { userId, problemId, language: input.language, code: input.code, verdict: "PENDING" },
  });

  await submitQueue.add("submit", { submissionId: submission.id });

  return submission;
}

export async function getSubmissionById(
  id: string,
  requestingUser: { id: string; role: Role },
) {
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      problem: { select: { title: true, slug: true } },
      results: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!submission) throw new NotFoundError("Submission not found");
  if (submission.userId !== requestingUser.id && requestingUser.role !== "ADMIN") {
    throw new ForbiddenError();
  }

  return {
    ...toSummary(submission),
    code: submission.code,
    errorMessage: submission.errorMessage,
    runtimeMs: submission.runtimeMs,
    memoryKb: submission.memoryKb,
    results: submission.results.map((r) => ({
      orderIndex: r.orderIndex,
      verdict: r.verdict,
      runtimeMs: r.runtimeMs,
      memoryKb: r.memoryKb,
    })),
  };
}

export async function listSubmissions(
  query: SubmissionListQuery,
  requestingUser: { id: string; role: Role },
) {
  // Non-admins always see only their own, regardless of what's passed —
  // never trust a client-supplied user id to decide whose data to read.
  const targetUserId =
    requestingUser.role === "ADMIN" && query.userId ? query.userId : requestingUser.id;

  const where = { userId: targetUserId, ...(query.problemId ? { problemId: query.problemId } : {}) };

  const [items, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      select: SUMMARY_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.submission.count({ where }),
  ]);

  return {
    items: items.map(toSummary),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}
