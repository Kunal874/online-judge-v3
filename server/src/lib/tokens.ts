import { randomBytes, createHash } from "node:crypto";

// Random tokens are already high-entropy and not user-chosen, so a fast
// hash (unlike bcrypt for passwords) is the right tool here — we just
// don't want a DB leak to hand out directly-usable tokens.
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
