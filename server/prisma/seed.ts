import { prisma } from "../src/db/prisma.js";

const problems = [
  {
    slug: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "EASY" as const,
    tags: ["implementation"],
    statement:
      "Given an integer `n`, print the numbers from 1 to `n`, one per line. " +
      'For multiples of 3 print "Fizz" instead of the number, for multiples of 5 print "Buzz", ' +
      'and for multiples of both print "FizzBuzz".',
    constraints: "1 <= n <= 10000",
  },
  {
    slug: "sum-of-two-numbers",
    title: "Sum of Two Numbers",
    difficulty: "EASY" as const,
    tags: ["math", "implementation"],
    statement: "Given two integers `a` and `b` on a single line separated by a space, print `a + b`.",
    constraints: "-10^9 <= a, b <= 10^9",
  },
  {
    slug: "palindrome-check",
    title: "Palindrome Check",
    difficulty: "MEDIUM" as const,
    tags: ["strings"],
    statement:
      'Given a string `s`, print "YES" if it reads the same forwards and backwards ' +
      '(ignoring case), otherwise print "NO".',
    constraints: "1 <= length of s <= 1000",
  },
];

for (const problem of problems) {
  await prisma.problem.upsert({
    where: { slug: problem.slug },
    update: {},
    create: { ...problem, isPublished: true },
  });
}

console.log(`Seeded ${problems.length} problems.`);
await prisma.$disconnect();
