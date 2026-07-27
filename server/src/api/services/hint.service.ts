import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../lib/errors.js";

/**
 * The stuck ladder for a problem, from the caller's point of view.
 *
 * Only rungs this user has actually opened carry their text. The rest are
 * reported as existing, with their label, and nothing else — a hint whose
 * body ships with the page has already been given, whatever the UI does
 * afterwards, and the reveal log would be recording clicks rather than
 * help received.
 */
export async function getLadder(problemId: string, userId: string | undefined) {
  const [hints, reveals] = await Promise.all([
    prisma.problemHint.findMany({
      where: { problemId },
      orderBy: { orderIndex: "asc" },
      select: { orderIndex: true, label: true, body: true },
    }),
    userId
      ? prisma.hintReveal.findMany({
          where: { userId, problemId },
          select: { orderIndex: true },
        })
      : Promise.resolve([]),
  ]);

  const revealed = new Set(reveals.map((r) => r.orderIndex));

  return {
    total: hints.length,
    revealedCount: revealed.size,
    rungs: hints.map((hint) => ({
      orderIndex: hint.orderIndex,
      label: hint.label,
      revealed: revealed.has(hint.orderIndex),
      body: revealed.has(hint.orderIndex) ? hint.body : null,
    })),
  };
}

/**
 * Opens the next unopened rung.
 *
 * Deliberately "next" rather than "this one": taking an index from the
 * client would let anyone jump straight to the final rung while logging a
 * reveal of the first. The ladder is only meaningful climbed in order.
 */
export async function revealNextRung(problemId: string, userId: string) {
  const hints = await prisma.problemHint.findMany({
    where: { problemId },
    orderBy: { orderIndex: "asc" },
    select: { orderIndex: true, label: true, body: true },
  });
  if (hints.length === 0) throw new NotFoundError("This problem has no hints");

  const reveals = await prisma.hintReveal.findMany({
    where: { userId, problemId },
    select: { orderIndex: true },
  });
  const revealed = new Set(reveals.map((r) => r.orderIndex));

  const next = hints.find((hint) => !revealed.has(hint.orderIndex));
  if (!next) throw new NotFoundError("Every rung is already open");

  // upsert, not create: two clicks racing each other should leave one
  // record and both succeed, rather than one failing on the unique index.
  await prisma.hintReveal.upsert({
    where: {
      userId_problemId_orderIndex: { userId, problemId, orderIndex: next.orderIndex },
    },
    update: {},
    create: { userId, problemId, orderIndex: next.orderIndex },
  });

  return getLadder(problemId, userId);
}

/** How many rungs this user opened on each of the given problems. */
export async function hintCountsByProblem(userId: string, problemIds: string[]) {
  const rows = await prisma.hintReveal.groupBy({
    by: ["problemId"],
    where: { userId, problemId: { in: problemIds } },
    _count: true,
  });
  return new Map(rows.map((row) => [row.problemId, row._count]));
}
