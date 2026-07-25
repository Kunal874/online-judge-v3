import { Router } from "express";
import * as contestController from "../controllers/contest.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateQuery } from "../middleware/validate.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { contestListQuerySchema } from "@online-judge/shared";

export const contestRouter = Router();

// Public, but the response depends on who's asking (isRegistered, and
// whether a running contest's problems are readable).
contestRouter.get(
  "/",
  optionalAuth,
  validateQuery(contestListQuerySchema),
  asyncHandler(contestController.list),
);
contestRouter.get("/:slug", optionalAuth, asyncHandler(contestController.getBySlug));
contestRouter.get("/:slug/leaderboard", asyncHandler(contestController.leaderboard));
contestRouter.get(
  "/:slug/problems/:label",
  optionalAuth,
  asyncHandler(contestController.getProblem),
);

contestRouter.post("/:slug/register", requireAuth, asyncHandler(contestController.register));
