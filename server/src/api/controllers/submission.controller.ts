import type { Request, Response } from "express";
import type { SubmissionListQuery } from "@online-judge/shared";
import * as submissionService from "../services/submission.service.js";
import { UnauthorizedError } from "../../lib/errors.js";

export async function create(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  const submission = await submissionService.createSubmission(
    req.user.id,
    req.params.problemId!,
    req.body,
  );
  res.status(202).json({ submissionId: submission.id });
}

export async function getById(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  const submission = await submissionService.getSubmissionById(req.params.id!, req.user);
  res.json({ submission });
}

export async function list(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  // Safe because validateQuery(submissionListQuerySchema) always runs first.
  const result = await submissionService.listSubmissions(
    req.query as unknown as SubmissionListQuery,
    req.user,
  );
  res.json(result);
}
