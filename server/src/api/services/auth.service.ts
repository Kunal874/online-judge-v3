import { prisma } from "../../db/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { generateToken, hashToken } from "../../lib/tokens.js";
import { sendMail } from "../../email/mailer.js";
import { verifyEmailTemplate, resetPasswordTemplate } from "../../email/templates.js";
import { ConflictError, UnauthorizedError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import type { RegisterInput, LoginInput, PublicUser } from "@online-judge/shared";
import type { UserModel as User } from "../../generated/prisma/models.js";

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    handle: user.handle,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

export async function registerUser(input: RegisterInput): Promise<User> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { handle: input.handle }] },
  });
  if (existing) {
    throw new ConflictError(
      existing.email === input.email ? "Email is already registered" : "Handle is already taken",
    );
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      handle: input.handle,
      name: input.name,
    },
  });

  // A slow/failed email shouldn't fail registration itself — the user can
  // always hit "resend verification" once logged in.
  requestEmailVerification(user.id).catch((err) => {
    logger.error({ err, userId: user.id }, "Failed to send verification email");
  });

  return user;
}

export async function loginUser(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same generic message whether the email doesn't exist or the password is
  // wrong — distinguishing them would let an attacker enumerate registered emails.
  if (!user) throw new UnauthorizedError("Invalid email or password");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  return user;
}

export async function requestEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) return;

  const { raw, hash } = generateToken();
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyTokenHash: hash,
      emailVerifyExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });

  const link = `${env.FRONTEND_URL}/verify-email?token=${raw}`;
  await sendMail({
    to: user.email,
    subject: "Verify your Online Judge email",
    html: verifyEmailTemplate(link),
  });
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const hash = hashToken(rawToken);
  const user = await prisma.user.findUnique({ where: { emailVerifyTokenHash: hash } });
  if (!user || !user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
    throw new UnauthorizedError("Invalid or expired verification link");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyTokenHash: null, emailVerifyExpires: null },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Deliberately silent no-op if the email doesn't exist — the controller
  // always returns the same 200 either way, avoiding user enumeration.
  if (!user) return;

  const { raw, hash } = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: hash, resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const link = `${env.FRONTEND_URL}/reset-password?token=${raw}`;
  await sendMail({
    to: user.email,
    subject: "Reset your Online Judge password",
    html: resetPasswordTemplate(link),
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const hash = hashToken(rawToken);
  const user = await prisma.user.findUnique({ where: { resetTokenHash: hash } });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    throw new UnauthorizedError("Invalid or expired reset link");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpires: null },
  });
}
