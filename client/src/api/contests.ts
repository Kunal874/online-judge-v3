import type {
  AddContestProblemInput,
  ContestDetail,
  ContestProblemDetail,
  ContestSummary,
  CreateContestInput,
  Leaderboard,
  UpdateContestInput,
} from "@online-judge/shared";
import { apiClient } from "./client";
import type { PaginatedResult } from "./problems";

export interface ContestListParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export async function fetchContests(params: ContestListParams) {
  const { data } = await apiClient.get<PaginatedResult<ContestSummary>>("/contests", { params });
  return data;
}

export async function fetchContestBySlug(slug: string) {
  const { data } = await apiClient.get<{ contest: ContestDetail }>(`/contests/${slug}`);
  return data.contest;
}

export async function fetchContestProblem(slug: string, label: string) {
  const { data } = await apiClient.get<{ contestProblem: ContestProblemDetail }>(
    `/contests/${slug}/problems/${label}`,
  );
  return data.contestProblem;
}

export async function fetchLeaderboard(slug: string) {
  const { data } = await apiClient.get<Leaderboard>(`/contests/${slug}/leaderboard`);
  return data;
}

export async function registerForContest(slug: string) {
  await apiClient.post(`/contests/${slug}/register`);
}

// --- admin ---

export interface AdminContest {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  problems: {
    id: string;
    label: string;
    points: number;
    orderIndex: number;
    problem: { id: string; slug: string; title: string; difficulty: string };
  }[];
}

export async function fetchAdminContests(params: ContestListParams) {
  const { data } = await apiClient.get<PaginatedResult<ContestSummary>>("/admin/contests", {
    params,
  });
  return data;
}

export async function fetchAdminContest(id: string) {
  const { data } = await apiClient.get<{ contest: AdminContest }>(`/admin/contests/${id}`);
  return data.contest;
}

export async function createContest(input: CreateContestInput) {
  const { data } = await apiClient.post<{ contest: AdminContest }>("/admin/contests", input);
  return data.contest;
}

export async function updateContest(id: string, input: UpdateContestInput) {
  const { data } = await apiClient.put<{ contest: AdminContest }>(`/admin/contests/${id}`, input);
  return data.contest;
}

export async function deleteContest(id: string) {
  await apiClient.delete(`/admin/contests/${id}`);
}

export async function addContestProblem(contestId: string, input: AddContestProblemInput) {
  await apiClient.post(`/admin/contests/${contestId}/problems`, input);
}

export async function removeContestProblem(contestId: string, problemId: string) {
  await apiClient.delete(`/admin/contests/${contestId}/problems/${problemId}`);
}
