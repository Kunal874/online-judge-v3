import type { Request, Response } from "express";
import type { RunJobStatus } from "@online-judge/shared";
import { runQueue } from "../../queue/queues.js";
import { NotFoundError, UnauthorizedError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

export async function createRun(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  const job = await runQueue.add("run", { ...req.body, userId: req.user.id });
  res.status(202).json({ jobId: job.id });
}

export async function getRunStatus(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();

  const job = await runQueue.getJob(req.params.jobId!);
  // Owner-scoped: a job that exists but belongs to someone else is
  // reported the same as one that doesn't exist at all.
  if (!job || job.data.userId !== req.user.id) throw new NotFoundError("Job not found");

  const state = await job.getState();
  let response: RunJobStatus;

  if (state === "completed") {
    response = { status: "completed", result: job.returnvalue };
  } else if (state === "failed") {
    logger.error({ jobId: job.id, reason: job.failedReason }, "Run job failed");
    response = { status: "failed", error: "Execution failed. Please try again." };
  } else if (state === "waiting" || state === "active" || state === "delayed") {
    response = { status: state };
  } else {
    // unknown/edge BullMQ state (e.g. "paused") — treat as still pending
    response = { status: "waiting" };
  }

  res.json(response);
}
