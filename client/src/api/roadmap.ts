import type { ConceptRoute, Roadmap } from "@online-judge/shared";
import { apiClient } from "./client";

export async function fetchRoadmap() {
  const { data } = await apiClient.get<{ roadmap: Roadmap }>("/roadmap");
  return data.roadmap;
}

export async function fetchConceptRoute(slug: string) {
  const { data } = await apiClient.get<{ route: ConceptRoute }>(`/roadmap/route/${slug}`);
  return data.route;
}
