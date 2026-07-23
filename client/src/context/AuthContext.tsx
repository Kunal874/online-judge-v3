import { createContext, use, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoginInput, PublicUser, RegisterInput } from "@online-judge/shared";
import { fetchMe, loginRequest, logoutRequest, registerRequest } from "../api/auth";

interface AuthContextValue {
  user: PublicUser | null | undefined;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<PublicUser>;
  register: (input: RegisterInput) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ME_QUERY_KEY = ["auth", "me"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => queryClient.setQueryData(ME_QUERY_KEY, null),
  });

  const value: AuthContextValue = {
    user,
    isLoading,
    login: (input) => loginMutation.mutateAsync(input),
    register: (input) => registerMutation.mutateAsync(input),
    logout: () => logoutMutation.mutateAsync(),
    refetchUser: () => refetch(),
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
