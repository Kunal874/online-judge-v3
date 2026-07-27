import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import { DIFFICULTIES } from "@online-judge/shared";
import type { Difficulty, Verdict } from "../../generated/prisma/enums.js";

const HEATMAP_DAYS = 365;
const ANALYTICS_WINDOW_DAYS = 90;
/** A solve's weight halves every this many days, so mastery decays rather than accruing forever. */
const MASTERY_HALF_LIFE_DAYS = 120;
const LONG_TAIL_MINUTES = 60;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}

/**
 * Every submission the user has made, joined to the problem's tags and
 * difficulty. The profile and the analytics page are two readings of this
 * same set, so it is fetched once and reduced twice rather than issuing a
 * separate query per statistic.
 */
async function submissionHistory(userId: string) {
  return prisma.submission.findMany({
    where: { userId },
    select: {
      problemId: true,
      verdict: true,
      runtimeMs: true,
      createdAt: true,
      problem: { select: { slug: true, title: true, tags: true, difficulty: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

type History = Awaited<ReturnType<typeof submissionHistory>>;

interface SolvedProblem {
  slug: string;
  title: string;
  tags: string[];
  difficulty: Difficulty;
  at: Date;
  /** Wall-clock from the first attempt at this problem to the accepted one. */
  minutes: number;
  attemptsBefore: number;
}

/** First accepted submission per problem, with how long it took to get there. */
function solvedProblems(history: History): Map<string, SolvedProblem> {
  const firstAttemptAt = new Map<string, Date>();
  const attemptsBefore = new Map<string, number>();
  const solved = new Map<string, SolvedProblem>();

  for (const submission of history) {
    const { problemId } = submission;
    if (!firstAttemptAt.has(problemId)) firstAttemptAt.set(problemId, submission.createdAt);

    if (submission.verdict === "ACCEPTED") {
      if (!solved.has(problemId)) {
        const started = firstAttemptAt.get(problemId)!;
        solved.set(problemId, {
          slug: submission.problem.slug,
          title: submission.problem.title,
          tags: submission.problem.tags,
          difficulty: submission.problem.difficulty,
          at: submission.createdAt,
          minutes: Math.round((submission.createdAt.getTime() - started.getTime()) / 60_000),
          attemptsBefore: attemptsBefore.get(problemId) ?? 0,
        });
      }
    } else if (!solved.has(problemId)) {
      // Only attempts before the first accept count — resubmitting an
      // already-solved problem to shave runtime isn't a failed attempt.
      attemptsBefore.set(problemId, (attemptsBefore.get(problemId) ?? 0) + 1);
    }
  }

  return solved;
}

export async function getUserProfile(handle: string) {
  const user = await prisma.user.findUnique({
    where: { handle },
    select: { id: true, handle: true, name: true, createdAt: true },
  });
  if (!user) throw new NotFoundError("User not found");

  const since = new Date();
  since.setDate(since.getDate() - HEATMAP_DAYS);

  const [history, problemCounts, registrations] = await Promise.all([
    submissionHistory(user.id),
    prisma.problem.groupBy({ by: ["difficulty"], where: { isPublished: true }, _count: true }),
    prisma.contestRegistration.findMany({
      where: { userId: user.id },
      select: {
        contest: {
          select: {
            slug: true,
            title: true,
            endsAt: true,
            isPublished: true,
            problems: { select: { problemId: true } },
          },
        },
      },
      orderBy: { contest: { endsAt: "desc" } },
    }),
  ]);

  const solved = solvedProblems(history);

  const countsByDate = new Map<string, number>();
  for (const { createdAt } of history) {
    if (createdAt < since) continue;
    const date = createdAt.toISOString().slice(0, 10);
    countsByDate.set(date, (countsByDate.get(date) ?? 0) + 1);
  }
  const heatmap = [...countsByDate.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Per-tag evidence. Runtime comes from accepted runs only — a median
  // across failures would mostly measure how long a wrong answer ran
  // before being wrong.
  const tagStats = new Map<
    string,
    { solved: number; attempts: number; firstTry: number; runtimes: number[] }
  >();
  const statsFor = (tag: string) => {
    let entry = tagStats.get(tag);
    if (!entry) {
      entry = { solved: 0, attempts: 0, firstTry: 0, runtimes: [] };
      tagStats.set(tag, entry);
    }
    return entry;
  };

  for (const submission of history) {
    for (const tag of submission.problem.tags) {
      const entry = statsFor(tag);
      entry.attempts += 1;
      if (submission.verdict === "ACCEPTED" && submission.runtimeMs != null) {
        entry.runtimes.push(submission.runtimeMs);
      }
    }
  }
  for (const problem of solved.values()) {
    for (const tag of problem.tags) {
      const entry = statsFor(tag);
      entry.solved += 1;
      if (problem.attemptsBefore === 0) entry.firstTry += 1;
    }
  }

  const strengths = [...tagStats.entries()]
    .filter(([, s]) => s.solved > 0)
    .map(([tag, s]) => ({
      tag,
      solved: s.solved,
      attempts: s.attempts,
      firstTry: s.firstTry,
      medianRuntimeMs: median(s.runtimes),
    }))
    .sort((a, b) => b.solved - a.solved || a.tag.localeCompare(b.tag));

  const availableByDifficulty = new Map(problemCounts.map((row) => [row.difficulty, row._count]));
  const solvedByDifficulty = new Map<string, number>();
  for (const problem of solved.values()) {
    solvedByDifficulty.set(
      problem.difficulty,
      (solvedByDifficulty.get(problem.difficulty) ?? 0) + 1,
    );
  }
  const byDifficulty = DIFFICULTIES.map((difficulty) => ({
    difficulty,
    solved: solvedByDifficulty.get(difficulty) ?? 0,
    available: availableByDifficulty.get(difficulty) ?? 0,
  }));

  const contests = registrations
    .filter((r) => r.contest.isPublished)
    .map((r) => {
      const problemIds = new Set(r.contest.problems.map((p) => p.problemId));
      let solvedHere = 0;
      for (const problemId of solved.keys()) if (problemIds.has(problemId)) solvedHere += 1;
      return {
        slug: r.contest.slug,
        title: r.contest.title,
        endsAt: r.contest.endsAt.toISOString(),
        solved: solvedHere,
        problemCount: problemIds.size,
      };
    });

  const totalSubmissions = history.length;
  const accepted = history.filter((s) => s.verdict === "ACCEPTED").length;

  return {
    handle: user.handle,
    name: user.name,
    joinedAt: user.createdAt.toISOString(),
    solvedCount: solved.size,
    totalSubmissions,
    acceptanceRate: totalSubmissions > 0 ? Math.round((accepted / totalSubmissions) * 1000) / 10 : 0,
    heatmap,
    strengths,
    byDifficulty,
    contests,
  };
}

/**
 * The private diagnostics page. Deliberately about failure and duration
 * rather than totals — the design's argument is that a solve count is the
 * one number that tells you nothing you can act on.
 */
export async function getAnalytics(userId: string) {
  const history = await submissionHistory(userId);

  const since = new Date();
  since.setDate(since.getDate() - ANALYTICS_WINDOW_DAYS);
  const recent = history.filter((s) => s.createdAt >= since);

  // Terminal non-accepted verdicts only: a submission still queued isn't a
  // failure, and counting it as one would make the breakdown flicker while
  // judging finishes.
  const failed = recent.filter(
    (s) => s.verdict !== "ACCEPTED" && s.verdict !== "PENDING" && s.verdict !== "RUNNING",
  );
  const failureCounts = new Map<Verdict, number>();
  for (const submission of failed) {
    failureCounts.set(submission.verdict, (failureCounts.get(submission.verdict) ?? 0) + 1);
  }
  const failures = [...failureCounts.entries()]
    .map(([verdict, count]) => ({
      verdict,
      count,
      share: failed.length > 0 ? Math.round((count / failed.length) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const solved = solvedProblems(history);
  const minutes = [...solved.values()].map((p) => p.minutes);

  const BUCKET_BOUNDS = [5, 15, 30, 60, Infinity];
  const BUCKET_LABELS = ["<5 min", "5–15", "15–30", "30–60", "60+"];
  const timeToFirstAcBuckets = BUCKET_LABELS.map((label, i) => ({
    label,
    count: minutes.filter((m) => m < BUCKET_BOUNDS[i]! && (i === 0 || m >= BUCKET_BOUNDS[i - 1]!))
      .length,
  }));

  const longTail = [...solved.values()]
    .filter((p) => p.minutes >= LONG_TAIL_MINUTES)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5)
    .map((p) => ({ title: p.title, slug: p.slug, minutes: p.minutes }));

  // Recency weighting: a solve's contribution halves every half-life, so a
  // tag drilled a year ago reads as weaker than one practised last week
  // even when the raw solve count is identical.
  const now = Date.now();
  const masteryByTag = new Map<string, { solved: number; weight: number; last: Date | null }>();
  for (const problem of solved.values()) {
    const ageDays = (now - problem.at.getTime()) / 86_400_000;
    const weight = Math.pow(0.5, ageDays / MASTERY_HALF_LIFE_DAYS);
    for (const tag of problem.tags) {
      const entry = masteryByTag.get(tag) ?? { solved: 0, weight: 0, last: null };
      entry.solved += 1;
      entry.weight += weight;
      if (!entry.last || problem.at > entry.last) entry.last = problem.at;
      masteryByTag.set(tag, entry);
    }
  }
  // Normalised against the strongest tag: this is a relative picture of
  // where the user is sharp, not an absolute score anyone should compare
  // between accounts.
  const maxWeight = Math.max(1e-9, ...[...masteryByTag.values()].map((e) => e.weight));
  const tagMastery = [...masteryByTag.entries()]
    .map(([tag, entry]) => ({
      tag,
      solved: entry.solved,
      recencyWeighted: Math.round((entry.weight / maxWeight) * 100),
      lastSolvedAt: entry.last?.toISOString() ?? null,
    }))
    .sort((a, b) => b.recencyWeighted - a.recencyWeighted);

  return {
    windowDays: ANALYTICS_WINDOW_DAYS,
    totalSubmissions: recent.length,
    failedSubmissions: failed.length,
    failures,
    timeToFirstAcMedianMinutes: median(minutes),
    timeToFirstAcBuckets,
    longTail,
    tagMastery,
  };
}
