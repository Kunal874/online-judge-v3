import type { UserProfile } from "@online-judge/shared";
import { apiClient } from "./client";

export async function fetchUserProfile(handle: string) {
  const { data } = await apiClient.get<{ profile: UserProfile }>(`/users/${handle}/profile`);
  return data.profile;
}
