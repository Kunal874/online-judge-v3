import { z } from "zod";
import { LANGUAGES, VERDICTS } from "../types/index.js";

export const createSubmissionSchema = z.object({
  language: z.enum(LANGUAGES),
  code: z.string().min(1).max(100_000),
});
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export const submissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  problemId: z.string().trim().min(1).optional(),
  // Only honored for admins — a non-admin always sees their own submissions
  // regardless of what's passed here.
  userId: z.string().trim().min(1).optional(),
});
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;

export const testCaseResultSchema = z.object({
  orderIndex: z.number(),
  verdict: z.enum(VERDICTS),
  runtimeMs: z.number().nullable(),
  memoryKb: z.number().nullable(),
});
export type TestCaseResultView = z.infer<typeof testCaseResultSchema>;

export const submissionSummarySchema = z.object({
  id: z.string(),
  problemId: z.string(),
  problemTitle: z.string(),
  problemSlug: z.string(),
  language: z.enum(LANGUAGES),
  verdict: z.enum(VERDICTS),
  passedCount: z.number(),
  totalCount: z.number(),
  createdAt: z.string(),
});
export type SubmissionSummary = z.infer<typeof submissionSummarySchema>;

export const submissionDetailSchema = submissionSummarySchema.extend({
  code: z.string(),
  errorMessage: z.string().nullable(),
  runtimeMs: z.number().nullable(),
  memoryKb: z.number().nullable(),
  results: z.array(testCaseResultSchema),
});
export type SubmissionDetail = z.infer<typeof submissionDetailSchema>;
