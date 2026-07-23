import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../lib/errors.js";

const HEATMAP_DAYS = 365;

export async function getUserProfile(handle: string) {
  const user = await prisma.user.findUnique({ where: { handle }, select: { id: true, handle: true, name: true } });
  if (!user) throw new NotFoundError("User not found");

  const since = new Date();
  since.setDate(since.getDate() - HEATMAP_DAYS);

  const [solvedGroups, totalSubmissions, acceptedSubmissions, recentSubmissions] = await Promise.all([
    prisma.submission.groupBy({ by: ["problemId"], where: { userId: user.id, verdict: "ACCEPTED" } }),
    prisma.submission.count({ where: { userId: user.id } }),
    prisma.submission.count({ where: { userId: user.id, verdict: "ACCEPTED" } }),
    prisma.submission.findMany({
      where: { userId: user.id, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const countsByDate = new Map<string, number>();
  for (const { createdAt } of recentSubmissions) {
    const date = createdAt.toISOString().slice(0, 10);
    countsByDate.set(date, (countsByDate.get(date) ?? 0) + 1);
  }
  const heatmap = [...countsByDate.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    handle: user.handle,
    name: user.name,
    solvedCount: solvedGroups.length,
    totalSubmissions,
    acceptanceRate: totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 1000) / 10 : 0,
    heatmap,
  };
}
