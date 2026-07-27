import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authCookie, createProblem, createUser } from "../helpers/factories.js";
import { prisma } from "../../src/db/prisma.js";
import type { Verdict } from "../../src/generated/prisma/enums.js";

/**
 * Submissions with controlled timestamps. The analytics are entirely
 * derived from ordering and gaps between attempts, so a test that let the
 * clock supply those would only prove the endpoint returns JSON.
 */
async function submit(
  userId: string,
  problemId: string,
  verdict: Verdict,
  minutesAgo: number,
  runtimeMs?: number,
) {
  return prisma.submission.create({
    data: {
      userId,
      problemId,
      language: "PYTHON",
      code: "print(1)",
      verdict,
      runtimeMs: runtimeMs ?? null,
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
    },
  });
}

describe("GET /users/me/analytics", () => {
  it("requires a session", async () => {
    const res = await request(app).get("/users/me/analytics");
    expect(res.status).toBe(401);
  });

  it("measures time to first AC from the first attempt, not the accepted one", async () => {
    const user = await createUser();
    const problem = await createProblem();

    // Three attempts: first 50 minutes ago, accepted 20 minutes ago.
    await submit(user.id, problem.id, "WRONG_ANSWER", 50);
    await submit(user.id, problem.id, "TIME_LIMIT_EXCEEDED", 35);
    await submit(user.id, problem.id, "ACCEPTED", 20, 120);

    const res = await request(app).get("/users/me/analytics").set("Cookie", authCookie(user));
    expect(res.status).toBe(200);

    const { analytics } = res.body;
    // 50 - 20 = 30 minutes of work, not the 20 since the accepted run.
    expect(analytics.timeToFirstAcMedianMinutes).toBe(30);
    expect(analytics.timeToFirstAcBuckets.find((b: { label: string }) => b.label === "30–60").count).toBe(1);
  });

  it("counts failures by verdict and excludes still-judging submissions", async () => {
    const user = await createUser();
    const problem = await createProblem();

    await submit(user.id, problem.id, "WRONG_ANSWER", 40);
    await submit(user.id, problem.id, "WRONG_ANSWER", 30);
    await submit(user.id, problem.id, "RUNTIME_ERROR", 20);
    // Neither of these is a failure — one succeeded, one hasn't finished.
    await submit(user.id, problem.id, "ACCEPTED", 10);
    await submit(user.id, problem.id, "PENDING", 5);

    const res = await request(app).get("/users/me/analytics").set("Cookie", authCookie(user));
    const { analytics } = res.body;

    expect(analytics.failedSubmissions).toBe(3);
    expect(analytics.failures[0]).toMatchObject({ verdict: "WRONG_ANSWER", count: 2 });
    expect(analytics.failures.map((f: { verdict: string }) => f.verdict)).not.toContain("PENDING");
    // Two of three failures, to one decimal place.
    expect(analytics.failures[0].share).toBeCloseTo(66.7, 0);
  });

  it("flags a problem that took over an hour as long tail", async () => {
    const user = await createUser();
    const quick = await createProblem({ title: "Quick one" });
    const slog = await createProblem({ title: "The slog" });

    await submit(user.id, quick.id, "ACCEPTED", 200);
    await submit(user.id, slog.id, "WRONG_ANSWER", 180);
    await submit(user.id, slog.id, "ACCEPTED", 90); // 90 minutes later

    const res = await request(app).get("/users/me/analytics").set("Cookie", authCookie(user));
    const { analytics } = res.body;

    expect(analytics.longTail).toHaveLength(1);
    expect(analytics.longTail[0]).toMatchObject({ title: "The slog", minutes: 90 });
  });

  it("weights a recent solve above an old one for the same tag count", async () => {
    const user = await createUser();
    const old = await createProblem();
    const fresh = await createProblem();
    await prisma.problem.update({ where: { id: old.id }, data: { tags: ["rusty"] } });
    await prisma.problem.update({ where: { id: fresh.id }, data: { tags: ["current"] } });

    // One solve each, but a year apart.
    await submit(user.id, old.id, "ACCEPTED", 365 * 24 * 60);
    await submit(user.id, fresh.id, "ACCEPTED", 60);

    const res = await request(app).get("/users/me/analytics").set("Cookie", authCookie(user));
    const mastery: { tag: string; solved: number; recencyWeighted: number }[] =
      res.body.analytics.tagMastery;

    const rusty = mastery.find((m) => m.tag === "rusty")!;
    const current = mastery.find((m) => m.tag === "current")!;

    expect(rusty.solved).toBe(current.solved); // identical raw counts…
    expect(current.recencyWeighted).toBeGreaterThan(rusty.recencyWeighted); // …different weight
  });

  it("shows one user nothing of another's history", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const problem = await createProblem();
    await submit(owner.id, problem.id, "WRONG_ANSWER", 30);

    const res = await request(app).get("/users/me/analytics").set("Cookie", authCookie(stranger));
    expect(res.body.analytics.failedSubmissions).toBe(0);
  });
});

describe("GET /users/:handle/profile", () => {
  it("counts a first-try solve as evidence, and a retried one not", async () => {
    const user = await createUser();
    const cleanSolve = await createProblem();
    const struggled = await createProblem();
    await prisma.problem.update({ where: { id: cleanSolve.id }, data: { tags: ["graphs"] } });
    await prisma.problem.update({ where: { id: struggled.id }, data: { tags: ["graphs"] } });

    await submit(user.id, cleanSolve.id, "ACCEPTED", 100, 50);
    await submit(user.id, struggled.id, "WRONG_ANSWER", 90);
    await submit(user.id, struggled.id, "ACCEPTED", 80, 70);

    const res = await request(app).get(`/users/${user.handle}/profile`);
    expect(res.status).toBe(200);

    const graphs = res.body.profile.strengths.find((s: { tag: string }) => s.tag === "graphs");
    expect(graphs.solved).toBe(2);
    expect(graphs.firstTry).toBe(1);
    expect(graphs.medianRuntimeMs).toBe(60); // median of 50 and 70
  });

  it("reports solved against available per difficulty", async () => {
    const user = await createUser();
    const easy = await createProblem();
    await createProblem(); // unsolved, but still available
    await submit(user.id, easy.id, "ACCEPTED", 10);

    const res = await request(app).get(`/users/${user.handle}/profile`);
    const row = res.body.profile.byDifficulty.find(
      (d: { difficulty: string }) => d.difficulty === "EASY",
    );
    expect(row.solved).toBe(1);
    expect(row.available).toBe(2);
  });

  it("never exposes an email address", async () => {
    const user = await createUser();
    const res = await request(app).get(`/users/${user.handle}/profile`);
    expect(JSON.stringify(res.body)).not.toContain(user.email);
  });
});
