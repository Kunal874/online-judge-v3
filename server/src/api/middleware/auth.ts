import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { verifyAuthToken } from "../../lib/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../../lib/errors.js";
import type { Role } from "../../generated/prisma/enums.js";

// Identity always comes from the verified cookie — never from a client-
// supplied id/email in the request body.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) throw new UnauthorizedError();

  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired session");
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}
