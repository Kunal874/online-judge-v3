import { z } from "zod";
import { DIFFICULTIES } from "../types/index.js";

export const difficultySchema = z.enum(DIFFICULTIES);

export const createProblemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  statement: z.string().trim().min(1),
  difficulty: difficultySchema,
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  constraints: z.string().trim().max(2000).optional(),
  timeLimitMs: z.number().int().min(100).max(10000).default(2000),
  memoryLimitKb: z
    .number()
    .int()
    .min(16384)
    .max(1048576)
    .default(262144),
  isPublished: z.boolean().default(false),
});
export type CreateProblemInput = z.infer<typeof createProblemSchema>;

export const updateProblemSchema = createProblemSchema.partial();
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;

export const problemListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  difficulty: difficultySchema.optional(),
  tag: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});
export type ProblemListQuery = z.infer<typeof problemListQuerySchema>;

export const publicProblemSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  difficulty: difficultySchema,
  tags: z.array(z.string()),
});
export type PublicProblemSummary = z.infer<typeof publicProblemSummarySchema>;

export const publicProblemDetailSchema = publicProblemSummarySchema.extend({
  statement: z.string(),
  constraints: z.string().nullable(),
  timeLimitMs: z.number(),
  memoryLimitKb: z.number(),
});
export type PublicProblemDetail = z.infer<typeof publicProblemDetailSchema>;
