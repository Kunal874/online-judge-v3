import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import type { MasteryLevel } from "@online-judge/shared";

/** Recall halves every this many days since the concept was last demonstrated. */
const RECALL_HALF_LIFE_DAYS = 90;

/**
 * Mastery from evidence, in four states rather than a percentage.
 *
 * Two solves a year ago is not the same knowledge as two solves last week,
 * so recall decays; but decay alone would let a single lucky solve read as
 * mastery, so the solve count gates the top tier independently.
 */
function masteryOf(solved: number, recall: number | null): MasteryLevel {
  if (solved === 0) return "unseen";
  if (recall !== null && recall < 40) return "shaky";
  if (solved >= 3 && (recall ?? 0) >= 60) return "mastered";
  return "solid";
}

function recallFrom(lastSolvedAt: Date | null): number | null {
  if (!lastSolvedAt) return null;
  const ageDays = (Date.now() - lastSolvedAt.getTime()) / 86_400_000;
  return Math.round(Math.pow(0.5, ageDays / RECALL_HALF_LIFE_DAYS) * 100);
}

interface ConceptRow {
  slug: string;
  name: string;
  blurb: string;
  requires: string[];
}

/**
 * Longest path from any root, so a concept always sits to the right of
 * everything it depends on. Shortest path would let an edge point
 * backwards whenever a concept has both a shallow and a deep prerequisite.
 */
function computeDepths(concepts: ConceptRow[]): Map<string, number> {
  const bySlug = new Map(concepts.map((c) => [c.slug, c]));
  const depths = new Map<string, number>();
  // Guards against a cycle in seeded data: without it a bad edge would
  // recurse until the stack gave out, in a request handler.
  const visiting = new Set<string>();

  const depthOf = (slug: string): number => {
    const cached = depths.get(slug);
    if (cached !== undefined) return cached;
    if (visiting.has(slug)) return 0;

    visiting.add(slug);
    const concept = bySlug.get(slug);
    const depth =
      !concept || concept.requires.length === 0
        ? 0
        : Math.max(...concept.requires.map((r) => depthOf(r) + 1));
    visiting.delete(slug);

    depths.set(slug, depth);
    return depth;
  };

  for (const concept of concepts) depthOf(concept.slug);
  return depths;
}

/**
 * Everything needed to draw the graph: the concepts, their edges, and how
 * far the user has actually got with each.
 *
 * A concept's evidence is solves of problems tagged with its slug — the tag
 * *is* the mapping, so a new problem joins the graph by being tagged rather
 * than by anyone maintaining a join table.
 */
export async function getRoadmap(userId: string | undefined) {
  const [conceptRows, problems, solvedRows] = await Promise.all([
    prisma.concept.findMany({
      orderBy: [{ tier: "asc" }, { slug: "asc" }],
      select: {
        slug: true,
        name: true,
        blurb: true,
        requires: { select: { prerequisite: { select: { slug: true } } } },
      },
    }),
    prisma.problem.findMany({ where: { isPublished: true }, select: { id: true, tags: true } }),
    userId
      ? prisma.submission.findMany({
          where: { userId, verdict: "ACCEPTED" },
          select: { problemId: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const concepts: ConceptRow[] = conceptRows.map((c) => ({
    slug: c.slug,
    name: c.name,
    blurb: c.blurb,
    requires: c.requires.map((r) => r.prerequisite.slug),
  }));

  const tagsByProblem = new Map(problems.map((p) => [p.id, p.tags]));
  const availableByTag = new Map<string, number>();
  for (const problem of problems) {
    for (const tag of problem.tags) {
      availableByTag.set(tag, (availableByTag.get(tag) ?? 0) + 1);
    }
  }

  // First accept per problem only — resubmitting a solved problem is not
  // additional evidence of anything.
  const firstSolveAt = new Map<string, Date>();
  for (const row of solvedRows) {
    if (!firstSolveAt.has(row.problemId)) firstSolveAt.set(row.problemId, row.createdAt);
  }

  const solvedByTag = new Map<string, { count: number; last: Date | null }>();
  for (const [problemId, at] of firstSolveAt) {
    for (const tag of tagsByProblem.get(problemId) ?? []) {
      const entry = solvedByTag.get(tag) ?? { count: 0, last: null };
      entry.count += 1;
      if (!entry.last || at > entry.last) entry.last = at;
      solvedByTag.set(tag, entry);
    }
  }

  const depths = computeDepths(concepts);

  const nodes = concepts.map((concept) => {
    const evidence = solvedByTag.get(concept.slug);
    const solved = evidence?.count ?? 0;
    const recall = recallFrom(evidence?.last ?? null);
    return {
      slug: concept.slug,
      name: concept.name,
      blurb: concept.blurb,
      depth: depths.get(concept.slug) ?? 0,
      mastery: masteryOf(solved, recall),
      solved,
      available: availableByTag.get(concept.slug) ?? 0,
      lastSolvedAt: evidence?.last?.toISOString() ?? null,
      recall,
      requires: concept.requires,
    };
  });

  return {
    concepts: nodes,
    demonstratedCount: nodes.filter((n) => n.mastery !== "unseen").length,
  };
}

/**
 * What stands between the user and a target concept.
 *
 * Walks prerequisites depth-first and keeps only what isn't already
 * demonstrated — the route is computed against what you've shown, not
 * against a fixed chapter order, so someone who already knows sorting
 * doesn't get sent back through it. Prerequisites are emitted before the
 * things that depend on them, which is what makes the result an order
 * rather than a set.
 */
export async function getConceptRoute(userId: string | undefined, targetSlug: string) {
  const roadmap = await getRoadmap(userId);
  const bySlug = new Map(roadmap.concepts.map((c) => [c.slug, c]));

  const target = bySlug.get(targetSlug);
  if (!target) throw new NotFoundError("Concept not found");

  const steps: typeof roadmap.concepts = [];
  const seen = new Set<string>();

  const walk = (slug: string) => {
    if (seen.has(slug)) return;
    seen.add(slug);

    const concept = bySlug.get(slug);
    if (!concept) return;

    // "mastered" is the only tier treated as done. Something shaky is
    // exactly what a route should send you back through.
    if (concept.mastery === "mastered" && slug !== targetSlug) return;

    for (const prerequisite of concept.requires) walk(prerequisite);
    steps.push(concept);
  };

  walk(targetSlug);

  return {
    target: targetSlug,
    steps: steps.map((step) => ({
      slug: step.slug,
      name: step.name,
      mastery: step.mastery,
      available: step.available,
      recall: step.recall,
    })),
    // Named separately rather than dropped: a route that quietly omits a
    // step nothing can teach would look complete and not be.
    unreachable: steps.filter((s) => s.available === 0).map((s) => s.slug),
  };
}
