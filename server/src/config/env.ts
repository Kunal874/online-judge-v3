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
  // Number of reverse proxies in front of the API, so Express can work out
  // the real client IP from X-Forwarded-For. 0 (no proxy) is right for local
  // dev; the production compose file runs caddy -> nginx -> api, so 2.
  //
  // This must match the real topology exactly. Too low and every request
  // appears to come from the proxy, collapsing all IP-keyed rate limiting
  // into a single shared bucket. Too high and a client can prepend a forged
  // X-Forwarded-For entry to impersonate any address it likes, which is
  // worse — it turns the rate limiter into something an attacker can walk
  // straight past.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  // Unset = platform-aware default (named pipe on Windows dev machines,
  // /var/run/docker.sock once the worker itself is containerized).
  DOCKER_SOCKET_PATH: z.string().optional(),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(2),
  // Ceilings for the ad-hoc Run endpoint, whose time and memory limits come
  // from the client rather than from a problem's stored configuration.
  //
  // The request schema's own maximum is a protocol bound, not a capacity
  // one: it permits 1 GB, which is more memory than a small host physically
  // has. Honouring that verbatim lets any signed-in user start containers
  // large enough to push the machine into swap and get Postgres OOM-killed
  // — a denial of service that needs no exploit, just the documented API.
  // These clamp the request down to what this host can actually absorb.
  JUDGE_MAX_TIME_MS: z.coerce.number().int().min(100).default(10_000),
  JUDGE_MAX_MEMORY_KB: z.coerce.number().int().min(16_384).default(262_144),
  // Gate running and submitting code behind a verified email address.
  // Off by default because turning it on without working mail delivery
  // locks out every account on the instance, including new ones.
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  // Unset = auto-create an Ethereal test SMTP account (dev only, nothing
  // is actually delivered). Set these once there's a real mail provider.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // The mail's From address. Left unset, it defaults to SMTP_USER — the
  // account actually authenticated with the SMTP server — which is the
  // only address that address's own SPF/DKIM/DMARC cover. Only set this to
  // something else once you own a domain and have configured that domain's
  // DNS to authorize this server to send as it; otherwise the mail claims
  // an identity nothing backs, and lands in spam.
  SMTP_FROM: z.string().optional(),
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

// Without SMTP_HOST the mailer falls back to an Ethereal test account, which
// delivers nothing to anyone. Requiring verification in that state means no
// account can ever be verified, and every user is permanently locked out of
// running and submitting — a failure that looks like a bug in the judge.
if (parsed.data.REQUIRE_EMAIL_VERIFICATION && !parsed.data.SMTP_HOST) {
  console.error(
    "Invalid environment configuration: REQUIRE_EMAIL_VERIFICATION=true needs SMTP_HOST set, " +
      "otherwise verification codes are never delivered and nobody can pass the check.",
  );
  process.exit(1);
}

export const env = { ...parsed.data, COOKIE_SECURE: cookieSecure };
