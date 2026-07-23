import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const userRouter = Router();

// Public — no email or other private data included.
userRouter.get("/:handle/profile", asyncHandler(userController.getProfile));
