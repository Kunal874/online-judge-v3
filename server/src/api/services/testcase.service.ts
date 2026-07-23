import { prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import type { CreateTestCaseInput, UpdateTestCaseInput } from "@online-judge/shared";

export async function listTestCasesForAdmin(problemId: string) {
  return prisma.testCase.findMany({
    where: { problemId },
    orderBy: { orderIndex: "asc" },
  });
}

export async function createTestCase(problemId: string, input: CreateTestCaseInput) {
  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) throw new NotFoundError("Problem not found");
  return prisma.testCase.create({ data: { ...input, problemId } });
}

async function getOwnedTestCase(problemId: string, testCaseId: string) {
  const testCase = await prisma.testCase.findFirst({ where: { id: testCaseId, problemId } });
  if (!testCase) throw new NotFoundError("Test case not found");
  return testCase;
}

export async function updateTestCase(
  problemId: string,
  testCaseId: string,
  input: UpdateTestCaseInput,
) {
  await getOwnedTestCase(problemId, testCaseId);
  return prisma.testCase.update({ where: { id: testCaseId }, data: input });
}

export async function deleteTestCase(problemId: string, testCaseId: string) {
  await getOwnedTestCase(problemId, testCaseId);
  await prisma.testCase.delete({ where: { id: testCaseId } });
}
