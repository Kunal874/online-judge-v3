import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { verifyAuthToken } from "../../lib/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../../lib/errors.js";
import { prisma } from "../../db/prisma.js";
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

// For endpoints that are public but answer differently when signed in —
// e.g. a contest listing that also reports whether you're registered.
// An absent or invalid cookie leaves req.user undefined rather than
// erroring, so a stale session degrades to the anonymous view.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      // Intentionally ignored — see above.
    }
  }
  next();
}

// Gates the endpoints that actually cost something to serve — running and
// submitting code — on a verified email, when the instance is configured to
// require it. Reading problems and leaderboards stays open either way.
//
// The check reads the database rather than the JWT: the cookie is issued at
// login and lives for a week, so a user who verified five minutes ago would
// otherwise keep being refused until their session happened to renew.
export async function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction) {
  if (!env.REQUIRE_EMAIL_VERIFICATION) return next();
  if (!req.user) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    throw new ForbiddenError("Verify your email address before running or submitting code.");
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) throw new ForbiddenError();
    next();
  };
}
