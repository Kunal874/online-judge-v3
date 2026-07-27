import { Router } from "express";
import * as problemController from "../controllers/problem.controller.js";
import * as submissionController from "../controllers/submission.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { optionalAuth, requireAuth, requireVerifiedEmail } from "../middleware/auth.js";
import { judgeLimiter } from "../middleware/rateLimiter.js";
import { createSubmissionSchema, problemListQuerySchema } from "@online-judge/shared";

export const problemRouter = Router();

problemRouter.get(
  "/",
  validateQuery(problemListQuerySchema),
  asyncHandler(problemController.list),
);
problemRouter.get("/:slug", asyncHandler(problemController.getBySlug));

// optionalAuth so a signed-out visitor still sees how many rungs exist and
// what each offers, without any of their text.
problemRouter.get("/:slug/hints", optionalAuth, asyncHandler(problemController.getHints));
problemRouter.post("/:slug/hints/reveal", requireAuth, asyncHandler(problemController.revealHint));

problemRouter.post(
  "/:problemId/submissions",
  requireAuth,
  asyncHandler(requireVerifiedEmail),
  judgeLimiter,
  validateBody(createSubmissionSchema),
  asyncHandler(submissionController.create),
);
