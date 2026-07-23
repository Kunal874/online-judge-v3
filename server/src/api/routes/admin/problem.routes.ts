import { Router } from "express";
import * as problemController from "../../controllers/problem.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  createProblemSchema,
  problemListQuerySchema,
  updateProblemSchema,
} from "@online-judge/shared";

export const adminProblemRouter = Router();

// Every route here requires an authenticated admin.
adminProblemRouter.use(requireAuth, requireRole("ADMIN"));

adminProblemRouter.get(
  "/",
  validateQuery(problemListQuerySchema),
  asyncHandler(problemController.adminList),
);
adminProblemRouter.get("/:id", asyncHandler(problemController.adminGet));
adminProblemRouter.post(
  "/",
  validateBody(createProblemSchema),
  asyncHandler(problemController.create),
);
adminProblemRouter.put(
  "/:id",
  validateBody(updateProblemSchema),
  asyncHandler(problemController.update),
);
adminProblemRouter.delete("/:id", asyncHandler(problemController.remove));
