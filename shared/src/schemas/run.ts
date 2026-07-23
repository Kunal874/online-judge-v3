import { z } from "zod";
import { LANGUAGES } from "../types/index.js";

export const runRequestSchema = z.object({
  language: z.enum(LANGUAGES),
  code: z.string().min(1).max(100_000),
  stdin: z.string().max(100_000).default(""),
  timeLimitMs: z.number().int().min(100).max(10_000).default(2000),
  memoryLimitKb: z.number().int().min(16_384).max(1_048_576).default(262_144),
});
export type RunRequest = z.infer<typeof runRequestSchema>;

export const runResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().nullable(),
  timedOut: z.boolean(),
  oomKilled: z.boolean(),
  durationMs: z.number(),
  compileError: z.string().nullable(),
});
export type RunResult = z.infer<typeof runResultSchema>;

export const runJobStatusSchema = z.object({
  status: z.enum(["waiting", "active", "delayed", "completed", "failed"]),
  result: runResultSchema.optional(),
  error: z.string().optional(),
});
export type RunJobStatus = z.infer<typeof runJobStatusSchema>;
