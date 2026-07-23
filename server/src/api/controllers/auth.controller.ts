import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { signAuthToken } from "../../lib/jwt.js";
import { registerUser, loginUser, toPublicUser } from "../services/auth.service.js";
import { UnauthorizedError } from "../../lib/errors.js";
import { prisma } from "../../db/prisma.js";
import type { UserModel as User } from "../../generated/prisma/models.js";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, user: User) {
  const token = signAuthToken({ sub: user.id, role: user.role });
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });
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
  res.clearCookie(env.COOKIE_NAME);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new UnauthorizedError();
  res.json({ user: toPublicUser(user) });
}
