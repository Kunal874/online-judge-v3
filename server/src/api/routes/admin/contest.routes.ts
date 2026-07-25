import { Router } from "express";
import * as contestController from "../../controllers/contest.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  addContestProblemSchema,
  contestListQuerySchema,
  createContestSchema,
  updateContestSchema,
} from "@online-judge/shared";

export const adminContestRouter = Router();

// Every route here requires an authenticated admin.
adminContestRouter.use(requireAuth, requireRole("ADMIN"));

adminContestRouter.get(
  "/",
  validateQuery(contestListQuerySchema),
  asyncHandler(contestController.adminList),
);
adminContestRouter.get("/:id", asyncHandler(contestController.adminGet));
adminContestRouter.post(
  "/",
  validateBody(createContestSchema),
  asyncHandler(contestController.create),
);
adminContestRouter.put(
  "/:id",
  validateBody(updateContestSchema),
  asyncHandler(contestController.update),
);
adminContestRouter.delete("/:id", asyncHandler(contestController.remove));

adminContestRouter.post(
  "/:id/problems",
  validateBody(addContestProblemSchema),
  asyncHandler(contestController.addProblem),
);
adminContestRouter.delete("/:id/problems/:problemId", asyncHandler(contestController.removeProblem));
