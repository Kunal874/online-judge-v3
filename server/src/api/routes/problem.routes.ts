import { Router } from "express";
import * as problemController from "../controllers/problem.controller.js";
import * as submissionController from "../controllers/submission.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { judgeLimiter } from "../middleware/rateLimiter.js";
import { createSubmissionSchema, problemListQuerySchema } from "@online-judge/shared";

export const problemRouter = Router();

problemRouter.get(
  "/",
  validateQuery(problemListQuerySchema),
  asyncHandler(problemController.list),
);
problemRouter.get("/:slug", asyncHandler(problemController.getBySlug));

problemRouter.post(
  "/:problemId/submissions",
  requireAuth,
  judgeLimiter,
  validateBody(createSubmissionSchema),
  asyncHandler(submissionController.create),
);
