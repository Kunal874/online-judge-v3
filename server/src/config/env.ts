import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  COOKIE_NAME: z.string().default("oj_token"),
  // "lax" is the safe default and works whenever the frontend and API share
  // an origin (the recommended deployment — see DEPLOYMENT.md). "none" is
  // only for a genuinely cross-site split, and gives up SameSite as a CSRF
  // defense, so it must be chosen deliberately rather than inferred.
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  // Unset = secure cookies in production, plain in dev (where there's no
  // TLS and a secure cookie would simply never be stored).
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  // Unset = platform-aware default (named pipe on Windows dev machines,
  // /var/run/docker.sock once the worker itself is containerized).
  DOCKER_SOCKET_PATH: z.string().optional(),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(2),
  // Unset = auto-create an Ethereal test SMTP account (dev only, nothing
  // is actually delivered). Set these once there's a real mail provider.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

// Fail fast on boot if the environment is misconfigured, rather than
// surfacing confusing errors deep inside a request handler later.
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const cookieSecure = parsed.data.COOKIE_SECURE ?? parsed.data.NODE_ENV === "production";

// Browsers reject SameSite=None on a non-secure cookie outright, so this
// combination would silently log everyone out rather than fail loudly.
if (parsed.data.COOKIE_SAMESITE === "none" && !cookieSecure) {
  console.error("Invalid environment configuration: COOKIE_SAMESITE=none requires secure cookies.");
  process.exit(1);
}

export const env = { ...parsed.data, COOKIE_SECURE: cookieSecure };
