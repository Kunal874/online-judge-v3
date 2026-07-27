import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/enums.js";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

const EXPIRES_IN = "7d";
const ALGORITHM = "HS256" as const;

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN, algorithm: ALGORITHM });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  // Pinned rather than inferred. Letting the token's own header choose the
  // algorithm is how signature verification gets talked out of happening —
  // the caller decides what it will accept, not the thing being checked.
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] }) as AuthTokenPayload;
}
