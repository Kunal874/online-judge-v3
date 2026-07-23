import type {
  CreateProblemInput,
  PublicProblemDetail,
  PublicProblemSummary,
  UpdateProblemInput,
} from "@online-judge/shared";
import { apiClient } from "./client";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProblemListParams {
  page?: number;
  pageSize?: number;
  difficulty?: string;
  tag?: string;
  search?: string;
}

export async function fetchProblems(params: ProblemListParams) {
  const { data } = await apiClient.get<PaginatedResult<PublicProblemSummary>>("/problems", {
    params,
  });
  return data;
}

export async function fetchProblemBySlug(slug: string) {
  const { data } = await apiClient.get<{ problem: PublicProblemDetail }>(`/problems/${slug}`);
  return data.problem;
}

// --- admin ---

export interface AdminProblem extends PublicProblemDetail {
  isPublished: boolean;
}

export async function fetchAdminProblems(params: ProblemListParams) {
  const { data } = await apiClient.get<PaginatedResult<AdminProblem>>("/admin/problems", {
    params,
  });
  return data;
}

export async function fetchAdminProblem(id: string) {
  const { data } = await apiClient.get<{ problem: AdminProblem }>(`/admin/problems/${id}`);
  return data.problem;
}

export async function createProblem(input: CreateProblemInput) {
  const { data } = await apiClient.post<{ problem: AdminProblem }>("/admin/problems", input);
  return data.problem;
}

export async function updateProblem(id: string, input: UpdateProblemInput) {
  const { data } = await apiClient.put<{ problem: AdminProblem }>(`/admin/problems/${id}`, input);
  return data.problem;
}

export async function deleteProblem(id: string) {
  await apiClient.delete(`/admin/problems/${id}`);
}
