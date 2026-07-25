import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authCookie, createProblem, createUser } from "../helpers/factories.js";

// These deliberately exhaust a limiter window. The suite resets both stores
// between tests (see tests/helpers/setup.ts), so this doesn't bleed into
// anything else.
describe("rate limiting", () => {
  it("starts returning 429 once the auth window is exhausted", async () => {
    const attempt = () =>
      request(app).post("/auth/login").send({ email: "nobody@example.com", password: "wrong-one" });

    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await attempt()).status);
    }

    // Limit is 10 per window: the first ten are answered normally (401 for
    // bad credentials), the rest are rejected outright.
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it("limits the judge endpoint per user, not per IP", async () => {
    const problem = await createProblem();
    const heavyUser = await createUser();
    const quietUser = await createUser();

    // Exhaust the judge limit (20/window) as one user...
    for (let i = 0; i < 21; i++) {
      await request(app)
        .post(`/problems/${problem.id}/submissions`)
        .set("Cookie", authCookie(heavyUser))
        .send({ language: "PYTHON", code: "print(3)" });
    }

    const blocked = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(heavyUser))
      .send({ language: "PYTHON", code: "print(3)" });

    // ...a different user from the same IP must be unaffected, which is the
    // whole reason this limiter keys on user id.
    const unaffected = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(quietUser))
      .send({ language: "PYTHON", code: "print(3)" });

    expect(blocked.status).toBe(429);
    expect(unaffected.status).toBe(202);
  });
});
