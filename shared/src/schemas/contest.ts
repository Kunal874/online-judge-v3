import { z } from "zod";
import { publicProblemDetailSchema, publicProblemSummarySchema } from "./problem.js";

// Derived from the window and the current time rather than stored, so it
// can never drift out of sync with startsAt/endsAt.
export const CONTEST_STATUSES = ["UPCOMING", "RUNNING", "ENDED"] as const;
export type ContestStatus = (typeof CONTEST_STATUSES)[number];

const contestWindow = {
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
};

export const createContestSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).default(""),
    ...contestWindow,
    isPublished: z.boolean().default(false),
  })
  .refine((c) => c.endsAt > c.startsAt, {
    message: "Contest must end after it starts",
    path: ["endsAt"],
  });
export type CreateContestInput = z.infer<typeof createContestSchema>;

// .partial() can't be called on a refined schema, so the shape is made
// partial first and the same cross-field rule re-applied — skipped when
// only one of the two ends is being changed.
export const updateContestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((c) => !c.startsAt || !c.endsAt || c.endsAt > c.startsAt, {
    message: "Contest must end after it starts",
    path: ["endsAt"],
  });
export type UpdateContestInput = z.infer<typeof updateContestSchema>;

export const contestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(CONTEST_STATUSES).optional(),
});
export type ContestListQuery = z.infer<typeof contestListQuerySchema>;

export const addContestProblemSchema = z.object({
  problemId: z.string().min(1),
  label: z
    .string()
    .trim()
    .min(1)
    .max(4)
    .regex(/^[A-Za-z0-9]+$/, "Label can only contain letters and numbers"),
  points: z.number().int().min(1).max(10000).default(100),
  orderIndex: z.number().int().min(0).default(0),
});
export type AddContestProblemInput = z.infer<typeof addContestProblemSchema>;

export const contestSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(CONTEST_STATUSES),
  problemCount: z.number(),
  registrationCount: z.number(),
  isRegistered: z.boolean(),
});
export type ContestSummary = z.infer<typeof contestSummarySchema>;

export const contestProblemSummarySchema = z.object({
  label: z.string(),
  points: z.number(),
  orderIndex: z.number(),
  problem: publicProblemSummarySchema,
});
export type ContestProblemSummary = z.infer<typeof contestProblemSummarySchema>;

export const contestDetailSchema = contestSummarySchema.extend({
  description: z.string(),
  // Absent entirely (not empty) before the contest starts — the statements
  // must not be readable ahead of time.
  problems: z.array(contestProblemSummarySchema).nullable(),
});
export type ContestDetail = z.infer<typeof contestDetailSchema>;

export const contestProblemDetailSchema = z.object({
  label: z.string(),
  points: z.number(),
  contest: z.object({
    // Needed by the client to tag a submission with this contest.
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    status: z.enum(CONTEST_STATUSES),
    endsAt: z.string(),
  }),
  problem: publicProblemDetailSchema,
});
export type ContestProblemDetail = z.infer<typeof contestProblemDetailSchema>;

export const leaderboardProblemCellSchema = z.object({
  label: z.string(),
  solved: z.boolean(),
  attempts: z.number(),
  // Minutes from contest start to the accepted submission; null until solved.
  solvedAtMinute: z.number().nullable(),
});
export type LeaderboardProblemCell = z.infer<typeof leaderboardProblemCellSchema>;

export const leaderboardRowSchema = z.object({
  rank: z.number(),
  handle: z.string(),
  name: z.string(),
  solvedCount: z.number(),
  penalty: z.number(),
  problems: z.array(leaderboardProblemCellSchema),
});
export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

export const leaderboardSchema = z.object({
  contest: z.object({
    slug: z.string(),
    title: z.string(),
    status: z.enum(CONTEST_STATUSES),
    startsAt: z.string(),
    endsAt: z.string(),
  }),
  labels: z.array(z.string()),
  rows: z.array(leaderboardRowSchema),
});
export type Leaderboard = z.infer<typeof leaderboardSchema>;
