import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const userRouter = Router();

// Declared before "/:handle/profile" so the literal path isn't captured as
// a handle named "me".
userRouter.get("/me/analytics", requireAuth, asyncHandler(userController.getMyAnalytics));

// Public — no email or other private data included.
userRouter.get("/:handle/profile", asyncHandler(userController.getProfile));
