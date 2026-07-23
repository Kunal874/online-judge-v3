import { Router } from "express";
import * as problemController from "../controllers/problem.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateQuery } from "../middleware/validate.js";
import { problemListQuerySchema } from "@online-judge/shared";

export const problemRouter = Router();

problemRouter.get(
  "/",
  validateQuery(problemListQuerySchema),
  asyncHandler(problemController.list),
);
problemRouter.get("/:slug", asyncHandler(problemController.getBySlug));
