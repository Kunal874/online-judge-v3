import type {
  ForgotPasswordInput,
  LoginInput,
  PublicUser,
  RegisterInput,
  ResetPasswordInput,
} from "@online-judge/shared";
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

export async function verifyEmailRequest(token: string): Promise<void> {
  await apiClient.post("/auth/verify-email", { token });
}

export async function resendVerificationRequest(): Promise<void> {
  await apiClient.post("/auth/resend-verification");
}

export async function forgotPasswordRequest(input: ForgotPasswordInput): Promise<void> {
  await apiClient.post("/auth/forgot-password", input);
}

export async function resetPasswordRequest(input: ResetPasswordInput): Promise<void> {
  await apiClient.post("/auth/reset-password", input);
}
