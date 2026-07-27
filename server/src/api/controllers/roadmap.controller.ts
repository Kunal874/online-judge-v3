import type { Request, Response } from "express";
import * as roadmapService from "../services/roadmap.service.js";

export async function getRoadmap(req: Request, res: Response) {
  const roadmap = await roadmapService.getRoadmap(req.user?.id);
  res.json({ roadmap });
}

export async function getRoute(req: Request, res: Response) {
  const route = await roadmapService.getConceptRoute(req.user?.id, req.params.slug!);
  res.json({ route });
}
