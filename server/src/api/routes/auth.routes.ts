import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateBody } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@online-judge/shared";

export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register),
);
authRouter.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login),
);
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));

authRouter.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  asyncHandler(authController.verifyEmailHandler),
);
authRouter.post(
  "/resend-verification",
  requireAuth,
  authLimiter,
  asyncHandler(authController.resendVerification),
);
authRouter.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
authRouter.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPasswordHandler),
);
