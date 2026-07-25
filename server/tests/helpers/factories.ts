import { createApp } from "../../src/api/app.js";
import { prisma } from "../../src/db/prisma.js";
import { hashPassword } from "../../src/lib/password.js";
import { signAuthToken } from "../../src/lib/jwt.js";
import { env } from "../../src/config/env.js";
import type { Role } from "../../src/generated/prisma/enums.js";

export const app = createApp();

// bcrypt at cost 12 is ~200ms per hash by design. Tests that don't
// specifically exercise login reuse this single hash of TEST_PASSWORD
// rather than paying that cost per created user.
export const TEST_PASSWORD = "correct horse battery";
let cachedHash: string | null = null;

async function testPasswordHash(): Promise<string> {
  cachedHash ??= await hashPassword(TEST_PASSWORD);
  return cachedHash;
}

let uniqueCounter = 0;
function unique(prefix: string): string {
  return `${prefix}${++uniqueCounter}`;
}

export async function createUser(
  overrides: { role?: Role; emailVerified?: boolean; handle?: string; email?: string } = {},
) {
  const handle = overrides.handle ?? unique("user");
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${handle}@example.com`,
      passwordHash: await testPasswordHash(),
      handle,
      name: `Test ${handle}`,
      role: overrides.role ?? "USER",
      emailVerified: overrides.emailVerified ?? true,
    },
  });
}

// The auth middleware only ever reads identity from a signed cookie, so a
// directly-signed token is exactly what a real login would have produced —
// without spending a bcrypt verify per test.
export function authCookie(user: { id: string; role: Role }): string {
  return `${env.COOKIE_NAME}=${signAuthToken({ sub: user.id, role: user.role })}`;
}

export async function createProblem(
  overrides: { isPublished?: boolean; title?: string; slug?: string } = {},
) {
  const slug = overrides.slug ?? unique("problem-");
  return prisma.problem.create({
    data: {
      slug,
      title: overrides.title ?? `Problem ${slug}`,
      statement: "Given two integers, print their sum.",
      difficulty: "EASY",
      tags: ["math"],
      isPublished: overrides.isPublished ?? true,
    },
  });
}

const MINUTE_MS = 60_000;

// Windows are expressed relative to now so a test can say "running" or
// "already finished" without freezing the clock.
export async function createContest(
  overrides: {
    isPublished?: boolean;
    slug?: string;
    title?: string;
    startsAt?: Date;
    endsAt?: Date;
    /** Shorthand for a sensible window; ignored if startsAt/endsAt given. */
    when?: "upcoming" | "running" | "ended";
  } = {},
) {
  const slug = overrides.slug ?? unique("contest-");
  const now = Date.now();
  const windows = {
    upcoming: [now + 60 * MINUTE_MS, now + 120 * MINUTE_MS],
    running: [now - 30 * MINUTE_MS, now + 30 * MINUTE_MS],
    ended: [now - 120 * MINUTE_MS, now - 60 * MINUTE_MS],
  } as const;
  const [defaultStart, defaultEnd] = windows[overrides.when ?? "running"];

  return prisma.contest.create({
    data: {
      slug,
      title: overrides.title ?? `Contest ${slug}`,
      description: "A test contest.",
      startsAt: overrides.startsAt ?? new Date(defaultStart),
      endsAt: overrides.endsAt ?? new Date(defaultEnd),
      isPublished: overrides.isPublished ?? true,
    },
  });
}

export async function addProblemToContest(
  contestId: string,
  problemId: string,
  overrides: { label?: string; points?: number; orderIndex?: number } = {},
) {
  return prisma.contestProblem.create({
    data: {
      contestId,
      problemId,
      label: overrides.label ?? "A",
      points: overrides.points ?? 100,
      orderIndex: overrides.orderIndex ?? 0,
    },
  });
}

export async function registerFor(contestId: string, userId: string) {
  return prisma.contestRegistration.create({ data: { contestId, userId } });
}

// Contest submissions are normally created through the API, but leaderboard
// tests need precise timestamps and verdicts, which only direct writes give.
export async function createContestSubmission(
  contestId: string,
  userId: string,
  problemId: string,
  verdict: "ACCEPTED" | "WRONG_ANSWER" | "PENDING" | "RUNTIME_ERROR",
  createdAt: Date,
) {
  return prisma.submission.create({
    data: {
      userId,
      problemId,
      contestId,
      language: "PYTHON",
      code: "print(3)",
      verdict,
      createdAt,
    },
  });
}

export async function createTestCase(
  problemId: string,
  overrides: { isHidden?: boolean; input?: string; expectedOutput?: string; orderIndex?: number } = {},
) {
  return prisma.testCase.create({
    data: {
      problemId,
      input: overrides.input ?? "1 2",
      expectedOutput: overrides.expectedOutput ?? "3",
      isHidden: overrides.isHidden ?? true,
      orderIndex: overrides.orderIndex ?? 0,
    },
  });
}
