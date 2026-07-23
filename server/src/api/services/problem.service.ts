import { prisma } from "../../db/prisma.js";
import { slugify } from "../../lib/slugify.js";
import { NotFoundError } from "../../lib/errors.js";
import type {
  CreateProblemInput,
  ProblemListQuery,
  UpdateProblemInput,
} from "@online-judge/shared";

const SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  difficulty: true,
  tags: true,
} as const;

const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  statement: true,
  constraints: true,
  timeLimitMs: true,
  memoryLimitKb: true,
} as const;

async function buildWhere(query: ProblemListQuery, includeUnpublished: boolean) {
  return {
    ...(includeUnpublished ? {} : { isPublished: true }),
    ...(query.difficulty ? { difficulty: query.difficulty } : {}),
    ...(query.tag ? { tags: { has: query.tag } } : {}),
    ...(query.search ? { title: { contains: query.search, mode: "insensitive" as const } } : {}),
  };
}

export async function listProblems(query: ProblemListQuery, includeUnpublished = false) {
  const where = await buildWhere(query, includeUnpublished);
  const [items, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      select: includeUnpublished ? { ...DETAIL_SELECT, isPublished: true } : SUMMARY_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.problem.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getPublishedProblemBySlug(slug: string) {
  const problem = await prisma.problem.findFirst({
    where: { slug, isPublished: true },
    select: {
      ...DETAIL_SELECT,
      testCases: {
        where: { isHidden: false },
        select: { id: true, input: true, expectedOutput: true, orderIndex: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
  if (!problem) throw new NotFoundError("Problem not found");
  const { testCases: sampleTestCases, ...rest } = problem;
  return { ...rest, sampleTestCases };
}

export async function getProblemById(id: string) {
  const problem = await prisma.problem.findUnique({ where: { id } });
  if (!problem) throw new NotFoundError("Problem not found");
  return problem;
}

async function uniqueSlugFrom(title: string): Promise<string> {
  const base = slugify(title) || "problem";
  let candidate = base;
  let suffix = 2;
  while (await prisma.problem.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

export async function createProblem(input: CreateProblemInput) {
  const slug = await uniqueSlugFrom(input.title);
  return prisma.problem.create({ data: { ...input, slug } });
}

// Slug is intentionally immutable after creation so links to a problem
// never break just because an admin edited its title later.
export async function updateProblem(id: string, input: UpdateProblemInput) {
  await getProblemById(id);
  return prisma.problem.update({ where: { id }, data: input });
}

export async function deleteProblem(id: string) {
  await getProblemById(id);
  await prisma.problem.delete({ where: { id } });
}
