import { Router } from "express";
import * as testCaseController from "../../controllers/testcase.controller.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { createTestCaseSchema, updateTestCaseSchema } from "@online-judge/shared";

// Mounted at /admin/problems/:problemId/testcases
export const adminTestCaseRouter = Router({ mergeParams: true });

adminTestCaseRouter.use(requireAuth, requireRole("ADMIN"));

adminTestCaseRouter.get("/", asyncHandler(testCaseController.list));
adminTestCaseRouter.post(
  "/",
  validateBody(createTestCaseSchema),
  asyncHandler(testCaseController.create),
);
adminTestCaseRouter.put(
  "/:testCaseId",
  validateBody(updateTestCaseSchema),
  asyncHandler(testCaseController.update),
);
adminTestCaseRouter.delete("/:testCaseId", asyncHandler(testCaseController.remove));
