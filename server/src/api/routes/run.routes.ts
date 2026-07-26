import { Router } from "express";
import * as runController from "../controllers/run.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { requireAuth, requireVerifiedEmail } from "../middleware/auth.js";
import { judgeLimiter } from "../middleware/rateLimiter.js";
import { runRequestSchema } from "@online-judge/shared";

export const runRouter = Router();

runRouter.post(
  "/",
  requireAuth,
  asyncHandler(requireVerifiedEmail),
  judgeLimiter,
  validateBody(runRequestSchema),
  asyncHandler(runController.createRun),
);
runRouter.get("/:jobId", requireAuth, asyncHandler(runController.getRunStatus));
