import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/enums.js";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

const EXPIRES_IN = "7d";

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
