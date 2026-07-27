import type { StuckLadder } from "@online-judge/shared";
import { apiClient } from "./client";

export async function fetchHints(slug: string) {
  const { data } = await apiClient.get<{ ladder: StuckLadder }>(`/problems/${slug}/hints`);
  return data.ladder;
}

/**
 * Opens the next unopened rung. The server picks which one — the ladder is
 * only meaningful climbed in order, so the client doesn't get to name an
 * index and skip to the answer.
 */
export async function revealNextHint(slug: string) {
  const { data } = await apiClient.post<{ ladder: StuckLadder }>(`/problems/${slug}/hints/reveal`);
  return data.ladder;
}
