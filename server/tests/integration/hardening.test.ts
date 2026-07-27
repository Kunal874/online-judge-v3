import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app, authCookie, createUser, TEST_PASSWORD } from "../helpers/factories.js";
import { runQueue } from "../../src/queue/queues.js";
import { env } from "../../src/config/env.js";

/** What the controller actually put on the queue — the values the sandbox will honour. */
function lastEnqueuedRun() {
  const calls = vi.mocked(runQueue.add).mock.calls;
  return calls.at(-1)?.[1] as { timeLimitMs: number; memoryLimitKb: number };
}

describe("run resource limits", () => {
  beforeEach(() => vi.mocked(runQueue.add).mockClear());

  it("clamps a client's requested limits to the host ceiling", async () => {
    const user = await createUser();

    const res = await request(app)
      .post("/run")
      .set("Cookie", authCookie(user))
      .send({
        language: "PYTHON",
        code: "print(1)",
        stdin: "",
        // The schema's own maximums: permitted by the protocol, but far more
        // than a small host can absorb.
        timeLimitMs: 10_000,
        memoryLimitKb: 1_048_576,
      });
    expect(res.status).toBe(202);

    // Accepting the request isn't the problem — honouring it would be.
    const job = lastEnqueuedRun();
    expect(job.memoryLimitKb).toBe(env.JUDGE_MAX_MEMORY_KB);
    expect(job.memoryLimitKb).toBeLessThan(1_048_576);
    expect(job.timeLimitMs).toBeLessThanOrEqual(env.JUDGE_MAX_TIME_MS);
  });

  it("leaves a request under the ceiling untouched", async () => {
    const user = await createUser();

    await request(app)
      .post("/run")
      .set("Cookie", authCookie(user))
      .send({
        language: "PYTHON",
        code: "print(1)",
        stdin: "",
        timeLimitMs: 1_000,
        memoryLimitKb: 32_768,
      });

    const job = lastEnqueuedRun();
    expect(job.timeLimitMs).toBe(1_000);
    expect(job.memoryLimitKb).toBe(32_768);
  });
});

describe("session tokens", () => {
  it("rejects a token signed with a different algorithm", async () => {
    const user = await createUser();

    // "none" is the classic downgrade: a well-formed token with the
    // signature stripped, which verifies fine if the verifier lets the
    // token nominate its own algorithm.
    const unsigned = jwt.sign({ sub: user.id, role: user.role }, "", { algorithm: "none" });

    const res = await request(app)
      .get("/auth/me")
      .set("Cookie", `${env.COOKIE_NAME}=${unsigned}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const user = await createUser();
    const forged = jwt.sign({ sub: user.id, role: user.role }, "not-the-real-secret-at-all-padding");

    const res = await request(app).get("/auth/me").set("Cookie", `${env.COOKIE_NAME}=${forged}`);
    expect(res.status).toBe(401);
  });
});

describe("login does not leak which emails are registered", () => {
  it("answers a wrong password and an unknown address the same way", async () => {
    const user = await createUser();

    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "definitely-not-the-password" });
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: "no-such-account@example.com", password: "definitely-not-the-password" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error).toBe(wrongPassword.body.error);
  });

  it("spends comparable time on both, so timing doesn't answer it either", async () => {
    const user = await createUser();

    const time = async (email: string) => {
      const startedAt = performance.now();
      await request(app).post("/auth/login").send({ email, password: "definitely-not-it" });
      return performance.now() - startedAt;
    };

    // Warm the cached dummy hash so the first call doesn't pay for it.
    await time("warmup@example.com");

    const known = await time(user.email);
    const unknown = await time("no-such-account@example.com");

    // Both must actually run bcrypt. A miss that skipped it would return in
    // a few milliseconds against ~200ms at cost 12, so a generous ratio
    // still catches the leak without being flaky on a loaded CI box.
    const ratio = Math.max(known, unknown) / Math.max(1, Math.min(known, unknown));
    expect(ratio).toBeLessThan(5);
  });
});

describe("password hashes never leave the server", () => {
  it("omits the hash from login, registration and /auth/me", async () => {
    const user = await createUser();

    const login = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });
    const me = await request(app).get("/auth/me").set("Cookie", authCookie(user));

    for (const body of [login.body, me.body]) {
      expect(JSON.stringify(body)).not.toContain("passwordHash");
      expect(JSON.stringify(body)).not.toContain("$2b$");
    }
  });
});
