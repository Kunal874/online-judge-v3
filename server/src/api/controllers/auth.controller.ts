import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { signAuthToken } from "../../lib/jwt.js";
import {
  registerUser,
  loginUser,
  toPublicUser,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from "../services/auth.service.js";
import { UnauthorizedError } from "../../lib/errors.js";
import { prisma } from "../../db/prisma.js";
import type { UserModel as User } from "../../generated/prisma/models.js";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Shared by set and clear: a browser only removes a cookie when the
// clearing response matches its attributes, so a logout that omitted these
// would appear to succeed while leaving the session cookie in place.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
} as const;

function setAuthCookie(res: Response, user: User) {
  const token = signAuthToken({ sub: user.id, role: user.role });
  res.cookie(env.COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: COOKIE_MAX_AGE_MS });
}

export async function register(req: Request, res: Response) {
  const user = await registerUser(req.body);
  setAuthCookie(res, user);
  res.status(201).json({ user: toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const user = await loginUser(req.body);
  setAuthCookie(res, user);
  res.json({ user: toPublicUser(user) });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(env.COOKIE_NAME, COOKIE_OPTIONS);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new UnauthorizedError();
  res.json({ user: toPublicUser(user) });
}

export async function verifyEmailHandler(req: Request, res: Response) {
  await verifyEmail(req.body.token);
  res.status(204).send();
}

export async function resendVerification(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  await requestEmailVerification(req.user.id);
  res.status(204).send();
}

export async function forgotPassword(req: Request, res: Response) {
  await requestPasswordReset(req.body.email);
  // Always 200 regardless of whether the email exists — see the service.
  res.status(204).send();
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await resetPassword(req.body.token, req.body.newPassword);
  res.status(204).send();
}
