import { z } from "zod";

// Four states rather than a percentage. The design's legend is
// mastered/solid/shaky/unseen, and a bare number invites comparing two
// concepts that were measured from very different amounts of evidence.
export const MASTERY_LEVELS = ["unseen", "shaky", "solid", "mastered"] as const;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export const conceptNodeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  blurb: z.string(),
  /** Longest path from a root concept — the layer this sits on when drawn. */
  depth: z.number(),
  mastery: z.enum(MASTERY_LEVELS),
  solved: z.number(),
  /** Published problems carrying this concept's tag. Zero means nothing here teaches it yet. */
  available: z.number(),
  lastSolvedAt: z.string().nullable(),
  /** 0-100. Decays with time since the last solve; null when never demonstrated. */
  recall: z.number().nullable(),
  requires: z.array(z.string()),
});
export type ConceptNode = z.infer<typeof conceptNodeSchema>;

export const roadmapSchema = z.object({
  concepts: z.array(conceptNodeSchema),
  demonstratedCount: z.number(),
});
export type Roadmap = z.infer<typeof roadmapSchema>;

export const routeStepSchema = z.object({
  slug: z.string(),
  name: z.string(),
  mastery: z.enum(MASTERY_LEVELS),
  available: z.number(),
  /** Why this step is on the route: the weakest link is worth calling out. */
  recall: z.number().nullable(),
});

export const conceptRouteSchema = z.object({
  target: z.string(),
  /** Ordered prerequisites still worth doing, ending at the target. */
  steps: z.array(routeStepSchema),
  /** Steps whose problems don't exist yet, so the route can be honest about gaps. */
  unreachable: z.array(z.string()),
});
export type ConceptRoute = z.infer<typeof conceptRouteSchema>;
