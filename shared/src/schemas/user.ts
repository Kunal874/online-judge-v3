import { z } from "zod";

export const heatmapEntrySchema = z.object({
  date: z.string(), // YYYY-MM-DD
  count: z.number(),
});

export const userProfileSchema = z.object({
  handle: z.string(),
  name: z.string(),
  solvedCount: z.number(),
  totalSubmissions: z.number(),
  acceptanceRate: z.number(), // 0-100
  heatmap: z.array(heatmapEntrySchema),
});
export type UserProfile = z.infer<typeof userProfileSchema>;
