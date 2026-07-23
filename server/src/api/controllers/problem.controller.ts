import type { Request, Response } from "express";
import type { ProblemListQuery } from "@online-judge/shared";
import * as problemService from "../services/problem.service.js";

// Safe because the `validateQuery(problemListQuerySchema)` middleware
// always runs before these handlers and replaces req.query with parsed data.
function parsedQuery(req: Request): ProblemListQuery {
  return req.query as unknown as ProblemListQuery;
}

export async function list(req: Request, res: Response) {
  const result = await problemService.listProblems(parsedQuery(req));
  res.json(result);
}

export async function getBySlug(req: Request, res: Response) {
  const problem = await problemService.getPublishedProblemBySlug(req.params.slug!);
  res.json({ problem });
}

export async function adminList(req: Request, res: Response) {
  const result = await problemService.listProblems(parsedQuery(req), true);
  res.json(result);
}

export async function adminGet(req: Request, res: Response) {
  const problem = await problemService.getProblemById(req.params.id!);
  res.json({ problem });
}

export async function create(req: Request, res: Response) {
  const problem = await problemService.createProblem(req.body);
  res.status(201).json({ problem });
}

export async function update(req: Request, res: Response) {
  const problem = await problemService.updateProblem(req.params.id!, req.body);
  res.json({ problem });
}

export async function remove(req: Request, res: Response) {
  await problemService.deleteProblem(req.params.id!);
  res.status(204).send();
}
