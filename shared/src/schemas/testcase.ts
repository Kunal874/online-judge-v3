import { z } from "zod";

export const createTestCaseSchema = z.object({
  input: z.string().max(100_000),
  expectedOutput: z.string().max(100_000),
  isHidden: z.boolean().default(true),
  orderIndex: z.number().int().min(0).default(0),
});
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;

export const updateTestCaseSchema = createTestCaseSchema.partial();
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;

export const testCaseSchema = z.object({
  id: z.string(),
  problemId: z.string(),
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean(),
  orderIndex: z.number(),
});
export type TestCase = z.infer<typeof testCaseSchema>;

// What the public problem-detail endpoint embeds: sample cases only,
// never anything from isHidden:true rows.
export const sampleTestCaseSchema = z.object({
  id: z.string(),
  input: z.string(),
  expectedOutput: z.string(),
  orderIndex: z.number(),
});
export type SampleTestCase = z.infer<typeof sampleTestCaseSchema>;
