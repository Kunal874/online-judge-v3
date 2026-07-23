import type { LoginInput, PublicUser, RegisterInput } from "@online-judge/shared";
import { apiClient } from "./client";

export async function fetchMe(): Promise<PublicUser | null> {
  try {
    const { data } = await apiClient.get<{ user: PublicUser }>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function registerRequest(input: RegisterInput): Promise<PublicUser> {
  const { data } = await apiClient.post<{ user: PublicUser }>("/auth/register", input);
  return data.user;
}

export async function loginRequest(input: LoginInput): Promise<PublicUser> {
  const { data } = await apiClient.post<{ user: PublicUser }>("/auth/login", input);
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post("/auth/logout");
}
