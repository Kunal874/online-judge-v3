import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Tight limit on auth endpoints to slow down brute-forcing / registration abuse.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

// Bounds how often one user can flood the judge queue with run/submit jobs.
// Keyed by user id (this only ever runs after requireAuth), not IP, so it
// can't be dodged by switching networks and doesn't over-block shared IPs.
export const judgeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // req.ip alone is unsafe here: the same IPv6 address has multiple valid
  // textual forms, so a raw-string key lets a client dodge the limit just
  // by varying how it writes its own address. ipKeyGenerator normalizes
  // that before it's used as a key.
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown"),
  message: { error: "Too many run/submit requests. Please slow down." },
});
