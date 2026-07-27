import { prisma } from "../../db/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { generateToken, hashToken, generateOtp, otpMatches } from "../../lib/tokens.js";
import { sendMail } from "../../email/mailer.js";
import { verifyEmailTemplate, resetPasswordTemplate } from "../../email/templates.js";
import { ConflictError, TooManyRequestsError, UnauthorizedError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import type { RegisterInput, LoginInput, PublicUser } from "@online-judge/shared";
import type { UserModel as User } from "../../generated/prisma/models.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Short on purpose. A 6-digit code is only ~20 bits, so the window in which
// it is guessable matters far more than it would for a 256-bit link token.
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

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
  // Handle and email are checked separately, and answered very differently.
  //
  // A handle is public — it is printed on every leaderboard — so saying it
  // is taken reveals nothing an attacker could not read off the standings,
  // and withholding it just leaves people guessing why the form failed.
  //
  // An email address is not public. "That email is already registered" turns
  // this endpoint into an oracle for testing whether someone has an account
  // here, so the reply is deliberately non-committal: it tells a real person
  // (who knows their own address) exactly what to do next, while telling a
  // stranger probing addresses nothing they can act on.
  const [handleTaken, emailTaken] = await Promise.all([
    prisma.user.findUnique({ where: { handle: input.handle }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
  ]);

  if (handleTaken) {
    throw new ConflictError(`The handle "${input.handle}" is already taken. Try another one.`);
  }
  if (emailTaken) {
    throw new ConflictError(
      "We couldn't create that account. If you already have one, log in instead — or reset your password if you've forgotten it.",
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

// A bcrypt hash of a value nobody can log in with, compared against when no
// account matches. Without it, an unknown email returns before bcrypt runs
// and a known one returns after — a ~200ms gap at cost 12 that answers
// "does this address have an account here" just as clearly as a different
// error message would.
const DUMMY_HASH_PROMISE = hashPassword("password-that-matches-no-account");

export async function loginUser(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same generic message whether the email doesn't exist or the password is
  // wrong — and, via the dummy comparison above, the same timing too.
  if (!user) {
    await verifyPassword(input.password, await DUMMY_HASH_PROMISE);
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  return user;
}

export async function requestEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) return;

  // Per-account cooldown. The route is already IP rate limited, but that
  // does nothing to stop someone using one account to send a stranger a new
  // email every few seconds.
  if (user.emailOtpSentAt && Date.now() - user.emailOtpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new TooManyRequestsError("A code was just sent. Wait a minute before asking for another.");
  }

  const { code, hash } = generateOtp();
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailOtpHash: hash,
      emailOtpExpires: new Date(Date.now() + OTP_TTL_MS),
      // Reset on every issue, otherwise a user who exhausted their guesses
      // would still be locked out against a brand new code.
      emailOtpAttempts: 0,
      emailOtpSentAt: new Date(),
    },
  });

  await sendMail({
    to: user.email,
    subject: `${code} is your Online Judge verification code`,
    html: verifyEmailTemplate(code, Math.round(OTP_TTL_MS / 60_000)),
  });
}

export async function verifyEmailOtp(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError("Authentication required");
  // Already done. Treated as success so a double-submitted form doesn't
  // present an error for something that is in the state the user wanted.
  if (user.emailVerified) return;

  if (!user.emailOtpHash || !user.emailOtpExpires || user.emailOtpExpires < new Date()) {
    throw new UnauthorizedError("That code has expired. Request a new one.");
  }

  // Checked before comparing, so burning through guesses can't be retried
  // indefinitely by just sending one more request.
  if (user.emailOtpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new TooManyRequestsError("Too many incorrect codes. Request a new one.");
  }

  if (!otpMatches(code, user.emailOtpHash)) {
    const attempts = user.emailOtpAttempts + 1;
    await prisma.user.update({ where: { id: userId }, data: { emailOtpAttempts: attempts } });
    const left = OTP_MAX_ATTEMPTS - attempts;
    throw new UnauthorizedError(
      left > 0
        ? `That code isn't right. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
        : "Too many incorrect codes. Request a new one.",
    );
  }

  // Clearing the code is what makes it single-use — leaving it in place
  // would let the same digits be replayed until they expired on their own.
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
      emailOtpHash: null,
      emailOtpExpires: null,
      emailOtpAttempts: 0,
      emailOtpSentAt: null,
    },
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
