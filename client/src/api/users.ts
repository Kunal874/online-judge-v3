import type { Analytics, UserProfile } from "@online-judge/shared";
import { apiClient } from "./client";

export async function fetchUserProfile(handle: string) {
  const { data } = await apiClient.get<{ profile: UserProfile }>(`/users/${handle}/profile`);
  return data.profile;
}

/** Always the signed-in user's own diagnostics — the route takes no handle. */
export async function fetchMyAnalytics() {
  const { data } = await apiClient.get<{ analytics: Analytics }>("/users/me/analytics");
  return data.analytics;
}
