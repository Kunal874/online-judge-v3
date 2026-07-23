import { Router } from "express";
import * as submissionController from "../controllers/submission.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateQuery } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { submissionListQuerySchema } from "@online-judge/shared";

export const submissionRouter = Router();

submissionRouter.use(requireAuth);

submissionRouter.get(
  "/",
  validateQuery(submissionListQuerySchema),
  asyncHandler(submissionController.list),
);
submissionRouter.get("/:id", asyncHandler(submissionController.getById));
