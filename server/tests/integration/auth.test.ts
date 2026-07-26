import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, createUser, authCookie, TEST_PASSWORD } from "../helpers/factories.js";
import { prisma } from "../../src/db/prisma.js";
import { generateToken, hashToken, generateOtp, otpMatches } from "../../src/lib/tokens.js";

const VALID_REGISTRATION = {
  email: "new@example.com",
  password: "a-long-enough-password",
  handle: "newuser",
  name: "New User",
};

describe("POST /auth/register", () => {
  it("creates the user and returns them without the password hash", async () => {
    const res = await request(app).post("/auth/register").send(VALID_REGISTRATION);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "new@example.com", handle: "newuser" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("stores the password hashed, never in plaintext", async () => {
    await request(app).post("/auth/register").send(VALID_REGISTRATION);

    const user = await prisma.user.findUnique({ where: { email: "new@example.com" } });
    expect(user?.passwordHash).toBeTruthy();
    expect(user?.passwordHash).not.toBe(VALID_REGISTRATION.password);
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt
  });

  it("issues an httpOnly session cookie", async () => {
    const res = await request(app).post("/auth/register").send(VALID_REGISTRATION);

    const cookies = res.headers["set-cookie"] as unknown as string[];
    const authCookieHeader = cookies.find((c) => c.startsWith("oj_token="));
    expect(authCookieHeader).toBeDefined();
    expect(authCookieHeader).toMatch(/HttpOnly/i);
  });

  // Lax (not None) is what makes the cookie itself a CSRF defense; it works
  // because the API is served on the app's own origin in production.
  it("issues the session cookie as SameSite=Lax", async () => {
    const res = await request(app).post("/auth/register").send(VALID_REGISTRATION);

    const cookies = res.headers["set-cookie"] as unknown as string[];
    const authCookieHeader = cookies.find((c) => c.startsWith("oj_token="))!;
    expect(authCookieHeader).toMatch(/SameSite=Lax/i);
    expect(authCookieHeader).not.toMatch(/SameSite=None/i);
  });

  it("never assigns ADMIN even if the client asks for it", async () => {
    await request(app)
      .post("/auth/register")
      .send({ ...VALID_REGISTRATION, role: "ADMIN" });

    const user = await prisma.user.findUnique({ where: { email: "new@example.com" } });
    expect(user?.role).toBe("USER");
  });

  it("rejects a duplicate email with 409", async () => {
    await createUser({ email: "taken@example.com", handle: "taken" });

    const res = await request(app)
      .post("/auth/register")
      .send({ ...VALID_REGISTRATION, email: "taken@example.com" });

    expect(res.status).toBe(409);
  });

  it("rejects a password shorter than the minimum", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...VALID_REGISTRATION, password: "short" });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("accepts correct credentials", async () => {
    const user = await createUser({ email: "known@example.com", handle: "known" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.handle).toBe("known");
  });

  it("rejects a wrong password", async () => {
    const user = await createUser();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "definitely-not-the-password" });

    expect(res.status).toBe(401);
  });

  // Distinguishable responses would let an attacker discover which emails
  // are registered by trying them one at a time.
  it("gives the same response for an unknown email as for a wrong password", async () => {
    const user = await createUser();

    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "definitely-not-the-password" });
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "definitely-not-the-password" });

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body.error).toBe(wrongPassword.body.error);
  });
});

describe("GET /auth/me", () => {
  it("returns the caller identified by the cookie", async () => {
    const user = await createUser({ handle: "cookieuser" });

    const res = await request(app).get("/auth/me").set("Cookie", authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.user.handle).toBe("cookieuser");
  });

  it("rejects a request with no cookie", async () => {
    expect((await request(app).get("/auth/me")).status).toBe(401);
  });

  it("rejects a forged token not signed with our secret", async () => {
    // Structurally a JWT, but signed with the wrong key.
    const forged =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
      ".eyJzdWIiOiJmYWtlIiwicm9sZSI6IkFETUlOIn0" +
      ".not-a-valid-signature";

    const res = await request(app).get("/auth/me").set("Cookie", `oj_token=${forged}`);

    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  // A browser only removes a cookie when the clearing response matches its
  // attributes, so a mismatch here logs nobody out while still returning 204.
  it("clears the cookie with matching attributes", async () => {
    const res = await request(app).post("/auth/logout");

    expect(res.status).toBe(204);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    const cleared = cookies.find((c) => c.startsWith("oj_token="))!;
    expect(cleared).toMatch(/oj_token=;/);
    expect(cleared).toMatch(/HttpOnly/i);
    expect(cleared).toMatch(/SameSite=Lax/i);
  });
});

describe("password reset", () => {
  it("returns the same 204 whether or not the email exists", async () => {
    await createUser({ email: "real@example.com", handle: "realuser" });

    const known = await request(app).post("/auth/forgot-password").send({ email: "real@example.com" });
    const unknown = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "ghost@example.com" });

    expect(known.status).toBe(204);
    expect(unknown.status).toBe(204);
  });

  it("stores the reset token hashed, so a DB leak yields no usable token", async () => {
    await createUser({ email: "real@example.com", handle: "realuser" });
    await request(app).post("/auth/forgot-password").send({ email: "real@example.com" });

    const user = await prisma.user.findUnique({ where: { email: "real@example.com" } });
    expect(user?.resetTokenHash).toBeTruthy();
    expect(user?.resetTokenHash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });

  it("consumes the token so it cannot be replayed", async () => {
    const { raw, hash } = generateToken();
    const user = await createUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: hash, resetTokenExpires: new Date(Date.now() + 60_000) },
    });

    const first = await request(app)
      .post("/auth/reset-password")
      .send({ token: raw, newPassword: "brand-new-password" });
    const replay = await request(app)
      .post("/auth/reset-password")
      .send({ token: raw, newPassword: "another-new-password" });

    expect(first.status).toBe(204);
    expect(replay.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const { raw, hash } = generateToken();
    const user = await createUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: hash, resetTokenExpires: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: raw, newPassword: "brand-new-password" });

    expect(res.status).toBe(401);
  });

  it("hashes a raw token to what is stored", () => {
    const { raw, hash } = generateToken();
    expect(hashToken(raw)).toBe(hash);
  });
});

describe("email verification by OTP", () => {
  // The code is only ever stored hashed, so tests have to plant a known one
  // the same way the service would rather than read it back out.
  async function userWithPendingCode(code: string, overrides: { expiresInMs?: number } = {}) {
    const user = await createUser({ emailVerified: false });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailOtpHash: hashToken(code),
        emailOtpExpires: new Date(Date.now() + (overrides.expiresInMs ?? 60_000)),
        emailOtpAttempts: 0,
      },
    });
    return user;
  }

  it("marks the account verified and consumes the code", async () => {
    const user = await userWithPendingCode("123456");

    const res = await request(app)
      .post("/auth/verify-email")
      .set("Cookie", authCookie(user))
      .send({ code: "123456" });
    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.emailVerified).toBe(true);
    // Cleared, so the same digits can't be replayed before they expire.
    expect(updated?.emailOtpHash).toBeNull();
  });

  it("rejects a wrong code and counts the attempt", async () => {
    const user = await userWithPendingCode("123456");

    const res = await request(app)
      .post("/auth/verify-email")
      .set("Cookie", authCookie(user))
      .send({ code: "000000" });
    expect(res.status).toBe(401);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.emailVerified).toBe(false);
    expect(updated?.emailOtpAttempts).toBe(1);
  });

  it("stops accepting guesses once the attempt cap is reached", async () => {
    const user = await userWithPendingCode("123456");
    await prisma.user.update({ where: { id: user.id }, data: { emailOtpAttempts: 5 } });

    // Even the correct code is refused — otherwise the cap could be walked
    // past by simply continuing to guess.
    const res = await request(app)
      .post("/auth/verify-email")
      .set("Cookie", authCookie(user))
      .send({ code: "123456" });
    expect(res.status).toBe(429);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.emailVerified).toBe(false);
  });

  it("rejects an expired code", async () => {
    const user = await userWithPendingCode("123456", { expiresInMs: -1000 });

    const res = await request(app)
      .post("/auth/verify-email")
      .set("Cookie", authCookie(user))
      .send({ code: "123456" });
    expect(res.status).toBe(401);
  });

  it("cannot be used to verify somebody else's account", async () => {
    const victim = await userWithPendingCode("123456");
    const attacker = await createUser({ emailVerified: false });

    // The account comes from the session, never from the request body, so
    // knowing another user's code buys nothing.
    const res = await request(app)
      .post("/auth/verify-email")
      .set("Cookie", authCookie(attacker))
      .send({ code: "123456" });
    expect(res.status).toBe(401);

    const stillUnverified = await prisma.user.findUnique({ where: { id: victim.id } });
    expect(stillUnverified?.emailVerified).toBe(false);
  });

  it("requires a session", async () => {
    const res = await request(app).post("/auth/verify-email").send({ code: "123456" });
    expect(res.status).toBe(401);
  });

  it("generates six-digit codes that match their own hash", () => {
    const { code, hash } = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
    expect(otpMatches(code, hash)).toBe(true);
    expect(otpMatches("999999", hashToken("111111"))).toBe(false);
  });
});
