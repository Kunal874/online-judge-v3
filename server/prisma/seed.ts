import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/lib/password.js";

interface SeedTestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

// A seeded generator, so the large cases below are identical on every run
// and in every environment. Math.random() would reseed each time, quietly
// giving different deployments different tests for the same problem.
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // xorshift32 — not good randomness, but stress data doesn't need it.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

// Big enough that a quadratic solution cannot finish inside the time limit,
// small enough that the intended linear one is never close to it. Verified
// on the deployment target rather than assumed — see DEPLOY-ORACLE.md.
const STRESS_N = 100_000;

function fizzBuzzOutput(n: number): string {
  const lines: string[] = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) lines.push("FizzBuzz");
    else if (i % 3 === 0) lines.push("Fizz");
    else if (i % 5 === 0) lines.push("Buzz");
    else lines.push(String(i));
  }
  return lines.join("\n");
}

function maxSubarrayCase(seed: number): SeedTestCase {
  const random = makeRandom(seed);
  const values: number[] = [];
  for (let i = 0; i < STRESS_N; i++) values.push(Math.floor(random() * 20_001) - 10_000);

  let best = values[0];
  let current = values[0];
  for (let i = 1; i < values.length; i++) {
    current = Math.max(values[i], current + values[i]);
    best = Math.max(best, current);
  }

  return { input: `${values.length}\n${values.join(" ")}`, expectedOutput: String(best) };
}

function longPalindromeCase(length: number, palindromic: boolean): SeedTestCase {
  const random = makeRandom(length + (palindromic ? 1 : 0));
  const half = Array.from({ length: Math.floor(length / 2) }, () =>
    String.fromCharCode(97 + Math.floor(random() * 26)),
  );
  const middle = length % 2 === 1 ? ["x"] : [];
  const chars = [...half, ...middle, ...half.slice().reverse()];

  if (!palindromic) {
    // Break the very last character, and pick it relative to the first so
    // it is guaranteed to differ — flipping to a fixed letter can silently
    // land on the one already there and leave the string a palindrome.
    chars[chars.length - 1] = chars[0] === "a" ? "b" : "a";
  }

  return { input: chars.join(""), expectedOutput: palindromic ? "YES" : "NO" };
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
      // The stated upper bound. Not a timing test — n is far too small for
      // that — but it does catch solutions that only work for tiny n, and
      // it makes the output large enough to catch anyone building the
      // answer by repeated string concatenation in a slow language.
      { input: "10000", expectedOutput: fizzBuzzOutput(10_000) },
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
    constraints: "1 <= length of s <= 200000",
    testCases: [
      { input: "racecar", expectedOutput: "YES", isHidden: false },
      { input: "hello", expectedOutput: "NO" },
      { input: "RaceCar", expectedOutput: "YES" },
      { input: "a", expectedOutput: "YES" },
      // Quadratic solutions are easy to write here by accident — repeatedly
      // slicing the ends off the string (`s = s[1:-1]`) copies it every
      // iteration. At this length that is ~2*10^10 character copies and
      // cannot finish; comparing against the reverse once is instant.
      longPalindromeCase(200_000, true),
      longPalindromeCase(200_000, false),
    ],
  },
  {
    slug: "maximum-subarray-sum",
    title: "Maximum Subarray Sum",
    difficulty: "MEDIUM",
    tags: ["arrays", "dynamic-programming"],
    statement:
      "The first line contains an integer `n`. The second line contains `n` integers. " +
      "Print the largest sum obtainable from any contiguous non-empty subarray.\n\n" +
      "Checking every possible subarray is too slow for the largest inputs — the " +
      "intended solution makes a single pass.",
    constraints: "1 <= n <= 100000, -10^4 <= each value <= 10^4",
    testCases: [
      { input: "5\n-2 1 -3 4 -1", expectedOutput: "4", isHidden: false },
      // All negative: the answer is the least-bad single element, not 0.
      // A solution initialising `best = 0` fails exactly here.
      { input: "4\n-5 -2 -9 -1", expectedOutput: "-1" },
      { input: "1\n7", expectedOutput: "7" },
      { input: "8\n-2 -3 4 -1 -2 1 5 -3", expectedOutput: "7" },
      maxSubarrayCase(20260726),
      maxSubarrayCase(987654321),
    ],
  },
];

for (const { testCases, ...problem } of problems) {
  // `update` carries the statement, constraints and tags, so editing a
  // problem here and re-running actually changes it. Leaving this empty
  // (the obvious upsert shape) makes the seed silently inert against any
  // database that already ran it once. isPublished is deliberately absent:
  // it is create-only, so re-seeding never republishes something an admin
  // took down on purpose.
  const row = await prisma.problem.upsert({
    where: { slug: problem.slug },
    update: problem,
    create: { ...problem, isPublished: true },
  });

  // Without test cases a submission judges against nothing and comes back
  // INTERNAL_ERROR, so these aren't optional for a usable seed.
  const existing = await prisma.testCase.findMany({
    where: { problemId: row.id },
    orderBy: { orderIndex: "asc" },
    select: { input: true, expectedOutput: true, isHidden: true },
  });

  const wanted = testCases.map((testCase) => ({
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    isHidden: testCase.isHidden ?? true,
  }));

  // Only touch them when they actually differ. Replacing cascades to
  // TestCaseResult, so an unconditional delete would wipe the per-case
  // breakdown of every past submission every time the seed runs.
  if (JSON.stringify(existing) !== JSON.stringify(wanted)) {
    await prisma.testCase.deleteMany({ where: { problemId: row.id } });
    await prisma.testCase.createMany({
      data: wanted.map((testCase, orderIndex) => ({
        problemId: row.id,
        ...testCase,
        orderIndex,
      })),
    });
    console.log(`  ${problem.slug}: wrote ${wanted.length} test cases`);
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
