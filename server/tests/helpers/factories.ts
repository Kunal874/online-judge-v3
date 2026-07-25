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
