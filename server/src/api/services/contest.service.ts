import { prisma } from "../../db/prisma.js";
import { slugify } from "../../lib/slugify.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors.js";
import type {
  AddContestProblemInput,
  ContestListQuery,
  ContestStatus,
  CreateContestInput,
  UpdateContestInput,
} from "@online-judge/shared";
import type { Role } from "../../generated/prisma/enums.js";

// Standard ICPC penalty: 20 minutes added for each rejected attempt on a
// problem that is eventually solved. Attempts on problems never solved cost
// nothing, which is what makes trying a hard problem late a free action.
const PENALTY_MINUTES_PER_REJECTION = 20;

interface Requester {
  id: string;
  role: Role;
}

export function contestStatus(
  contest: { startsAt: Date; endsAt: Date },
  now = new Date(),
): ContestStatus {
  if (now < contest.startsAt) return "UPCOMING";
  if (now >= contest.endsAt) return "ENDED";
  return "RUNNING";
}

function statusWindowFilter(status: ContestStatus | undefined, now: Date) {
  switch (status) {
    case "UPCOMING":
      return { startsAt: { gt: now } };
    case "RUNNING":
      return { startsAt: { lte: now }, endsAt: { gt: now } };
    case "ENDED":
      return { endsAt: { lte: now } };
    default:
      return {};
  }
}

export async function listContests(
  query: ContestListQuery,
  requester?: Requester,
  includeUnpublished = false,
) {
  const now = new Date();
  const where = {
    ...(includeUnpublished ? {} : { isPublished: true }),
    ...statusWindowFilter(query.status, now),
  };

  const [contests, total] = await Promise.all([
    prisma.contest.findMany({
      where,
      orderBy: { startsAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        _count: { select: { problems: true, registrations: true } },
        // Scoped to the caller so "am I registered" costs no extra query;
        // an anonymous caller matches nothing.
        registrations: requester
          ? { where: { userId: requester.id }, select: { id: true } }
          : { where: { userId: "" }, select: { id: true } },
      },
    }),
    prisma.contest.count({ where }),
  ]);

  return {
    items: contests.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
      status: contestStatus(c, now),
      problemCount: c._count.problems,
      registrationCount: c._count.registrations,
      isRegistered: c.registrations.length > 0,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

async function findPublishedContest(slug: string) {
  const contest = await prisma.contest.findFirst({ where: { slug, isPublished: true } });
  if (!contest) throw new NotFoundError("Contest not found");
  return contest;
}

export async function getContestBySlug(slug: string, requester?: Requester) {
  const contest = await prisma.contest.findFirst({
    where: { slug, isPublished: true },
    include: {
      _count: { select: { problems: true, registrations: true } },
      problems: {
        orderBy: { orderIndex: "asc" },
        include: {
          problem: { select: { id: true, slug: true, title: true, difficulty: true, tags: true } },
        },
      },
      registrations: requester
        ? { where: { userId: requester.id }, select: { id: true } }
        : { where: { userId: "" }, select: { id: true } },
    },
  });
  if (!contest) throw new NotFoundError("Contest not found");

  const status = contestStatus(contest);
  // Null rather than [] before the start: the problem set itself (titles,
  // difficulties, how many there are) is part of what a contest reveals at
  // start time, so it can't be readable in advance.
  const problems =
    status === "UPCOMING"
      ? null
      : contest.problems.map((cp) => ({
          label: cp.label,
          points: cp.points,
          orderIndex: cp.orderIndex,
          problem: cp.problem,
        }));

  return {
    id: contest.id,
    slug: contest.slug,
    title: contest.title,
    description: contest.description,
    startsAt: contest.startsAt.toISOString(),
    endsAt: contest.endsAt.toISOString(),
    status,
    problemCount: contest._count.problems,
    registrationCount: contest._count.registrations,
    isRegistered: contest.registrations.length > 0,
    problems,
  };
}

export async function registerForContest(slug: string, userId: string) {
  const contest = await findPublishedContest(slug);
  if (contestStatus(contest) === "ENDED") {
    throw new ConflictError("This contest has already ended");
  }

  try {
    await prisma.contestRegistration.create({ data: { contestId: contest.id, userId } });
  } catch {
    // Unique constraint on (contestId, userId) — registering twice is a
    // no-op rather than an error, since the end state is what was asked for.
    return;
  }
}

export async function isRegistered(contestId: string, userId: string): Promise<boolean> {
  const registration = await prisma.contestRegistration.findUnique({
    where: { contestId_userId: { contestId, userId } },
  });
  return registration !== null;
}

// Who may read a contest problem's statement:
//   UPCOMING  admins only — nobody gets a head start
//   RUNNING   registered participants (and admins)
//   ENDED     anyone, the contest is over and results are public
export async function getContestProblem(slug: string, label: string, requester?: Requester) {
  const contest = await findPublishedContest(slug);
  const status = contestStatus(contest);

  const isAdmin = requester?.role === "ADMIN";
  if (!isAdmin) {
    if (status === "UPCOMING") {
      // 404, not 403: acknowledging it exists would confirm the problem set.
      throw new NotFoundError("Contest problem not found");
    }
    if (status === "RUNNING") {
      if (!requester) throw new ForbiddenError("Register for this contest to view its problems");
      if (!(await isRegistered(contest.id, requester.id))) {
        throw new ForbiddenError("Register for this contest to view its problems");
      }
    }
  }

  const contestProblem = await prisma.contestProblem.findFirst({
    where: { contestId: contest.id, label },
    include: {
      problem: {
        include: {
          testCases: {
            where: { isHidden: false },
            select: { id: true, input: true, expectedOutput: true, orderIndex: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });
  if (!contestProblem) throw new NotFoundError("Contest problem not found");

  const { testCases, ...problem } = contestProblem.problem;
  return {
    label: contestProblem.label,
    points: contestProblem.points,
    contest: {
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      status,
      endsAt: contest.endsAt.toISOString(),
    },
    problem: {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      tags: problem.tags,
      constraints: problem.constraints,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
      sampleTestCases: testCases,
    },
  };
}

// Throws unless this user may submit this problem to this contest right
// now. Returns the contest so the caller can tag the submission with it.
export async function assertCanSubmitToContest(
  contestId: string,
  problemId: string,
  userId: string,
) {
  const contest = await prisma.contest.findFirst({ where: { id: contestId, isPublished: true } });
  if (!contest) throw new NotFoundError("Contest not found");

  const status = contestStatus(contest);
  if (status !== "RUNNING") {
    throw new ForbiddenError(
      status === "UPCOMING" ? "This contest has not started yet" : "This contest has ended",
    );
  }
  if (!(await isRegistered(contestId, userId))) {
    throw new ForbiddenError("Register for this contest before submitting");
  }

  const contestProblem = await prisma.contestProblem.findUnique({
    where: { contestId_problemId: { contestId, problemId } },
  });
  if (!contestProblem) throw new NotFoundError("That problem is not part of this contest");

  return contest;
}

export async function getLeaderboard(slug: string) {
  const contest = await prisma.contest.findFirst({
    where: { slug, isPublished: true },
    include: {
      problems: { orderBy: { orderIndex: "asc" } },
      registrations: {
        include: { user: { select: { id: true, handle: true, name: true } } },
      },
    },
  });
  if (!contest) throw new NotFoundError("Contest not found");

  // Only submissions tagged with this contest AND inside the window count.
  // The tag alone would be enough today (the API won't set it otherwise),
  // but the window check means an admin shifting contest times later can't
  // silently pull unrelated submissions into the standings.
  const submissions = await prisma.submission.findMany({
    where: {
      contestId: contest.id,
      createdAt: { gte: contest.startsAt, lt: contest.endsAt },
    },
    select: { userId: true, problemId: true, verdict: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const byUserProblem = new Map<string, typeof submissions>();
  for (const submission of submissions) {
    const key = `${submission.userId}:${submission.problemId}`;
    const bucket = byUserProblem.get(key);
    if (bucket) bucket.push(submission);
    else byUserProblem.set(key, [submission]);
  }

  const rows = contest.registrations.map((registration) => {
    const user = registration.user;
    let solvedCount = 0;
    let penalty = 0;

    const problems = contest.problems.map((contestProblem) => {
      const attemptsForProblem = byUserProblem.get(`${user.id}:${contestProblem.problemId}`) ?? [];
      const acceptedIndex = attemptsForProblem.findIndex((s) => s.verdict === "ACCEPTED");

      if (acceptedIndex === -1) {
        return {
          label: contestProblem.label,
          solved: false,
          attempts: attemptsForProblem.length,
          solvedAtMinute: null,
        };
      }

      const accepted = attemptsForProblem[acceptedIndex]!;
      const solvedAtMinute = Math.floor(
        (accepted.createdAt.getTime() - contest.startsAt.getTime()) / 60_000,
      );
      // Only rejections *before* the accepted one are penalized; anything
      // after it is irrelevant. PENDING/RUNNING aren't counted — a
      // submission still in the queue hasn't been judged wrong yet.
      const rejectionsBefore = attemptsForProblem
        .slice(0, acceptedIndex)
        .filter((s) => s.verdict !== "PENDING" && s.verdict !== "RUNNING").length;

      solvedCount += 1;
      penalty += solvedAtMinute + rejectionsBefore * PENALTY_MINUTES_PER_REJECTION;

      return {
        label: contestProblem.label,
        solved: true,
        attempts: acceptedIndex + 1,
        solvedAtMinute,
      };
    });

    return { handle: user.handle, name: user.name, solvedCount, penalty, problems };
  });

  // More solved wins; ties broken by lower penalty, then by handle so the
  // order is stable across requests rather than arbitrary.
  rows.sort(
    (a, b) =>
      b.solvedCount - a.solvedCount ||
      a.penalty - b.penalty ||
      a.handle.localeCompare(b.handle),
  );

  return {
    contest: {
      slug: contest.slug,
      title: contest.title,
      status: contestStatus(contest),
      startsAt: contest.startsAt.toISOString(),
      endsAt: contest.endsAt.toISOString(),
    },
    labels: contest.problems.map((p) => p.label),
    rows: rows.map((row, index) => ({ rank: index + 1, ...row })),
  };
}

async function uniqueSlugFrom(title: string): Promise<string> {
  const base = slugify(title) || "contest";
  let candidate = base;
  let suffix = 2;
  while (await prisma.contest.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

export async function createContest(input: CreateContestInput) {
  return prisma.contest.create({ data: { ...input, slug: await uniqueSlugFrom(input.title) } });
}

export async function getContestById(id: string) {
  const contest = await prisma.contest.findUnique({
    where: { id },
    include: {
      problems: {
        orderBy: { orderIndex: "asc" },
        include: { problem: { select: { id: true, slug: true, title: true, difficulty: true } } },
      },
    },
  });
  if (!contest) throw new NotFoundError("Contest not found");
  return contest;
}

// Slug stays fixed after creation for the same reason a problem's does —
// links shared during a contest must not break.
export async function updateContest(id: string, input: UpdateContestInput) {
  const existing = await getContestById(id);
  const startsAt = input.startsAt ?? existing.startsAt;
  const endsAt = input.endsAt ?? existing.endsAt;
  if (endsAt <= startsAt) {
    throw new ConflictError("Contest must end after it starts");
  }
  return prisma.contest.update({ where: { id }, data: input });
}

export async function deleteContest(id: string) {
  await getContestById(id);
  await prisma.contest.delete({ where: { id } });
}

export async function addProblemToContest(contestId: string, input: AddContestProblemInput) {
  await getContestById(contestId);
  const problem = await prisma.problem.findUnique({ where: { id: input.problemId } });
  if (!problem) throw new NotFoundError("Problem not found");

  try {
    return await prisma.contestProblem.create({ data: { contestId, ...input } });
  } catch {
    // Either (contestId, problemId) or (contestId, label) is taken — both
    // are unique constraints, and both mean the same thing to the caller.
    throw new ConflictError("That problem or label is already used in this contest");
  }
}

export async function removeProblemFromContest(contestId: string, problemId: string) {
  const contestProblem = await prisma.contestProblem.findUnique({
    where: { contestId_problemId: { contestId, problemId } },
  });
  if (!contestProblem) throw new NotFoundError("That problem is not part of this contest");
  await prisma.contestProblem.delete({ where: { id: contestProblem.id } });
}
