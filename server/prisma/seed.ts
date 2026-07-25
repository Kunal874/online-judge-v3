import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/lib/password.js";

interface SeedTestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

const problems: {
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
  statement: string;
  constraints: string;
  testCases: SeedTestCase[];
}[] = [
  {
    slug: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "EASY",
    tags: ["implementation"],
    statement:
      "Given an integer `n`, print the numbers from 1 to `n`, one per line. " +
      'For multiples of 3 print "Fizz" instead of the number, for multiples of 5 print "Buzz", ' +
      'and for multiples of both print "FizzBuzz".',
    constraints: "1 <= n <= 10000",
    testCases: [
      { input: "5", expectedOutput: "1\n2\nFizz\n4\nBuzz", isHidden: false },
      { input: "15", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz" },
      { input: "1", expectedOutput: "1" },
    ],
  },
  {
    slug: "sum-of-two-numbers",
    title: "Sum of Two Numbers",
    difficulty: "EASY",
    tags: ["math", "implementation"],
    statement:
      "Given two integers `a` and `b` on a single line separated by a space, print `a + b`.",
    constraints: "-10^9 <= a, b <= 10^9",
    testCases: [
      { input: "1 2", expectedOutput: "3", isHidden: false },
      { input: "-5 5", expectedOutput: "0" },
      // Overflows 32-bit signed — catches solutions using int in C/C++/Java.
      { input: "1000000000 1000000000", expectedOutput: "2000000000" },
    ],
  },
  {
    slug: "palindrome-check",
    title: "Palindrome Check",
    difficulty: "MEDIUM",
    tags: ["strings"],
    statement:
      'Given a string `s`, print "YES" if it reads the same forwards and backwards ' +
      '(ignoring case), otherwise print "NO".',
    constraints: "1 <= length of s <= 1000",
    testCases: [
      { input: "racecar", expectedOutput: "YES", isHidden: false },
      { input: "hello", expectedOutput: "NO" },
      { input: "RaceCar", expectedOutput: "YES" },
      { input: "a", expectedOutput: "YES" },
    ],
  },
];

for (const { testCases, ...problem } of problems) {
  const row = await prisma.problem.upsert({
    where: { slug: problem.slug },
    update: {},
    create: { ...problem, isPublished: true },
  });

  // Without test cases a submission judges against nothing and comes back
  // INTERNAL_ERROR, so these aren't optional for a usable seed.
  const existingCount = await prisma.testCase.count({ where: { problemId: row.id } });
  if (existingCount === 0) {
    await prisma.testCase.createMany({
      data: testCases.map((testCase, orderIndex) => ({
        problemId: row.id,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        isHidden: testCase.isHidden ?? true,
        orderIndex,
      })),
    });
  }
}

// A contest that is already running, so the contest flow is explorable
// immediately after seeding rather than requiring a wait.
const CONTEST_SLUG = "practice-round";
const existingContest = await prisma.contest.findUnique({ where: { slug: CONTEST_SLUG } });
if (!existingContest) {
  const now = Date.now();
  const contest = await prisma.contest.create({
    data: {
      slug: CONTEST_SLUG,
      title: "Practice Round",
      description: "A sample contest so the contest flow can be tried out locally.",
      startsAt: new Date(now - 30 * 60_000),
      endsAt: new Date(now + 150 * 60_000),
      isPublished: true,
    },
  });

  const contestProblems = await prisma.problem.findMany({
    where: { slug: { in: ["sum-of-two-numbers", "fizzbuzz"] } },
    orderBy: { slug: "asc" },
  });
  await prisma.contestProblem.createMany({
    data: contestProblems.map((problem, index) => ({
      contestId: contest.id,
      problemId: problem.id,
      label: String.fromCharCode(65 + index), // A, B, ...
      points: 100 * (index + 1),
      orderIndex: index,
    })),
  });
}

// Deliberately opt-in via env rather than a hard-coded default password:
// a seed that always creates a known-credential admin is a live
// vulnerability the moment it runs anywhere real.
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (adminPassword) {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: {
      email,
      handle: "admin",
      name: "Admin",
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      emailVerified: true,
    },
  });
  console.log(`Seeded admin user ${email}.`);
} else {
  console.log("Skipped admin user (set SEED_ADMIN_PASSWORD to create one).");
}

console.log(`Seeded ${problems.length} problems with test cases, and 1 contest.`);
await prisma.$disconnect();
