import type { CreateTestCaseInput, TestCase, UpdateTestCaseInput } from "@online-judge/shared";
import { apiClient } from "./client";

export async function fetchTestCases(problemId: string) {
  const { data } = await apiClient.get<{ testCases: TestCase[] }>(
    `/admin/problems/${problemId}/testcases`,
  );
  return data.testCases;
}

export async function createTestCase(problemId: string, input: CreateTestCaseInput) {
  const { data } = await apiClient.post<{ testCase: TestCase }>(
    `/admin/problems/${problemId}/testcases`,
    input,
  );
  return data.testCase;
}

export async function updateTestCase(
  problemId: string,
  testCaseId: string,
  input: UpdateTestCaseInput,
) {
  const { data } = await apiClient.put<{ testCase: TestCase }>(
    `/admin/problems/${problemId}/testcases/${testCaseId}`,
    input,
  );
  return data.testCase;
}

export async function deleteTestCase(problemId: string, testCaseId: string) {
  await apiClient.delete(`/admin/problems/${problemId}/testcases/${testCaseId}`);
}
