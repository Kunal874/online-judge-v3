import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";

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

const OTP_DIGITS = 6;

// A 6-digit code someone has to retype, so it is short by necessity rather
// than by choice. That makes it guessable in a way generateToken's output
// is not, and the security has to come from elsewhere: a short expiry and a
// hard cap on wrong guesses, both enforced in the auth service.
//
// randomInt is rejection-sampled by Node, so unlike `randomBytes % 1000000`
// the low codes aren't very slightly more likely than the high ones.
export function generateOtp(): { code: string; hash: string } {
  const code = String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, "0");
  return { code, hash: hashToken(code) };
}

// Compares in constant time. A plain === leaks, through how long it takes
// to fail, how many leading characters were right — enough to reconstruct a
// short code guess by guess.
export function otpMatches(candidate: string, storedHash: string): boolean {
  const candidateHash = Buffer.from(hashToken(candidate));
  const expected = Buffer.from(storedHash);
  if (candidateHash.length !== expected.length) return false;
  return timingSafeEqual(candidateHash, expected);
}
