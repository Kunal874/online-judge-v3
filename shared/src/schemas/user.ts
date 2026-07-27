import { z } from "zod";
import { DIFFICULTIES, VERDICTS } from "../types/index.js";

export const heatmapEntrySchema = z.object({
  date: z.string(), // YYYY-MM-DD
  count: z.number(),
});

// A tag the user has actually demonstrated, with the evidence attached.
// The design's framing is "demonstrated, not claimed": a strength is only
// worth showing next to how it was established.
export const tagStrengthSchema = z.object({
  tag: z.string(),
  solved: z.number(),
  attempts: z.number(),
  /** Solved on the first submission — the closest honest proxy for fluency. */
  firstTry: z.number(),
  medianRuntimeMs: z.number().nullable(),
});

export const difficultyCountSchema = z.object({
  difficulty: z.enum(DIFFICULTIES),
  solved: z.number(),
  available: z.number(),
});

export const contestHistoryEntrySchema = z.object({
  slug: z.string(),
  title: z.string(),
  endsAt: z.string(),
  solved: z.number(),
  problemCount: z.number(),
});

export const userProfileSchema = z.object({
  handle: z.string(),
  name: z.string(),
  joinedAt: z.string(),
  solvedCount: z.number(),
  totalSubmissions: z.number(),
  acceptanceRate: z.number(), // 0-100
  heatmap: z.array(heatmapEntrySchema),
  strengths: z.array(tagStrengthSchema),
  byDifficulty: z.array(difficultyCountSchema),
  contests: z.array(contestHistoryEntrySchema),
});
export type UserProfile = z.infer<typeof userProfileSchema>;
export type TagStrength = z.infer<typeof tagStrengthSchema>;

// ─── Private diagnostics ────────────────────────────────────────────────
// The design asks four questions no judge currently answers: why do I fail,
// how long do I take, how far from optimal am I, and what have I lost since
// I last looked. The first two are answerable from submission history alone.

export const failureBreakdownEntrySchema = z.object({
  verdict: z.enum(VERDICTS),
  count: z.number(),
  /** Share of all non-accepted submissions in the window, 0-100. */
  share: z.number(),
});

export const timeBucketSchema = z.object({
  label: z.string(),
  count: z.number(),
});

export const tagMasterySchema = z.object({
  tag: z.string(),
  solved: z.number(),
  /** 0-100, weighted so a recent solve counts for more than an old one. */
  recencyWeighted: z.number(),
  lastSolvedAt: z.string().nullable(),
});

export const longTailProblemSchema = z.object({
  title: z.string(),
  slug: z.string(),
  minutes: z.number(),
});

export const analyticsSchema = z.object({
  windowDays: z.number(),
  totalSubmissions: z.number(),
  failedSubmissions: z.number(),
  failures: z.array(failureBreakdownEntrySchema),
  /** Minutes from first attempt to first accepted, across solved problems. */
  timeToFirstAcMedianMinutes: z.number().nullable(),
  timeToFirstAcBuckets: z.array(timeBucketSchema),
  /** Problems that took more than an hour of attempts before landing. */
  longTail: z.array(longTailProblemSchema),
  tagMastery: z.array(tagMasterySchema),
});
export type Analytics = z.infer<typeof analyticsSchema>;
