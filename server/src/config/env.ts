import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  COOKIE_NAME: z.string().default("oj_token"),
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

export const env = parsed.data;
