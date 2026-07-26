import { z } from "zod";

// These messages are rendered verbatim under the matching field on the
// registration form, so they are written as advice to a person rather than
// as validator output. Rejecting input is cheap; explaining why is what
// stops someone retrying the same thing three times and giving up.
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  handle: z
    .string()
    .trim()
    .min(3, "Handle must be at least 3 characters")
    .max(20, "Handle can be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name can be at most 100 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  handle: z.string(),
  name: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  emailVerified: z.boolean(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;
