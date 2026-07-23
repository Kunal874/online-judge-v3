import type { CreateSubmissionInput, SubmissionDetail, SubmissionSummary } from "@online-judge/shared";
import { apiClient } from "./client";
import type { PaginatedResult } from "./problems";

export async function createSubmission(problemId: string, input: CreateSubmissionInput) {
  const { data } = await apiClient.post<{ submissionId: string }>(
    `/problems/${problemId}/submissions`,
    input,
  );
  return data;
}

export async function fetchSubmission(id: string) {
  const { data } = await apiClient.get<{ submission: SubmissionDetail }>(`/submissions/${id}`);
  return data.submission;
}

export interface SubmissionListParams {
  page?: number;
  pageSize?: number;
  problemId?: string;
}

export async function fetchSubmissions(params: SubmissionListParams) {
  const { data } = await apiClient.get<PaginatedResult<SubmissionSummary>>("/submissions", {
    params,
  });
  return data;
}
