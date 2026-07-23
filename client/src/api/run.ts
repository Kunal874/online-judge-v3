import type { RunJobStatus, RunRequest } from "@online-judge/shared";
import { apiClient } from "./client";

export async function createRun(input: RunRequest): Promise<{ jobId: string }> {
  const { data } = await apiClient.post<{ jobId: string }>("/run", input);
  return data;
}

export async function fetchRunStatus(jobId: string): Promise<RunJobStatus> {
  const { data } = await apiClient.get<RunJobStatus>(`/run/${jobId}`);
  return data;
}
