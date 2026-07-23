import { prisma } from "../../db/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { ConflictError, UnauthorizedError } from "../../lib/errors.js";
import type { RegisterInput, LoginInput, PublicUser } from "@online-judge/shared";
import type { UserModel as User } from "../../generated/prisma/models.js";

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
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      handle: input.handle,
      name: input.name,
    },
  });
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
