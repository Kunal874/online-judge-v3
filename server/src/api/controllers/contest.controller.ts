import type { Request, Response } from "express";
import type { ContestListQuery } from "@online-judge/shared";
import * as contestService from "../services/contest.service.js";
import { UnauthorizedError } from "../../lib/errors.js";

// Safe because validateQuery(contestListQuerySchema) always runs first.
function parsedQuery(req: Request): ContestListQuery {
  return req.query as unknown as ContestListQuery;
}

export async function list(req: Request, res: Response) {
  const result = await contestService.listContests(parsedQuery(req), req.user);
  res.json(result);
}

export async function getBySlug(req: Request, res: Response) {
  const contest = await contestService.getContestBySlug(req.params.slug!, req.user);
  res.json({ contest });
}

export async function register(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  await contestService.registerForContest(req.params.slug!, req.user.id);
  res.status(204).send();
}

export async function getProblem(req: Request, res: Response) {
  const contestProblem = await contestService.getContestProblem(
    req.params.slug!,
    req.params.label!,
    req.user,
  );
  res.json({ contestProblem });
}

export async function leaderboard(req: Request, res: Response) {
  const result = await contestService.getLeaderboard(req.params.slug!);
  res.json(result);
}

export async function adminList(req: Request, res: Response) {
  const result = await contestService.listContests(parsedQuery(req), req.user, true);
  res.json(result);
}

export async function adminGet(req: Request, res: Response) {
  const contest = await contestService.getContestById(req.params.id!);
  res.json({ contest });
}

export async function create(req: Request, res: Response) {
  const contest = await contestService.createContest(req.body);
  res.status(201).json({ contest });
}

export async function update(req: Request, res: Response) {
  const contest = await contestService.updateContest(req.params.id!, req.body);
  res.json({ contest });
}

export async function remove(req: Request, res: Response) {
  await contestService.deleteContest(req.params.id!);
  res.status(204).send();
}

export async function addProblem(req: Request, res: Response) {
  const contestProblem = await contestService.addProblemToContest(req.params.id!, req.body);
  res.status(201).json({ contestProblem });
}

export async function removeProblem(req: Request, res: Response) {
  await contestService.removeProblemFromContest(req.params.id!, req.params.problemId!);
  res.status(204).send();
}
