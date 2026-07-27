import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authCookie, createProblem, createUser } from "../helpers/factories.js";
import { prisma } from "../../src/db/prisma.js";

const RUNGS = [
  { label: "reframe", body: "SECRET-RUNG-ONE" },
  { label: "the recurrence", body: "SECRET-RUNG-TWO" },
  { label: "the full approach", body: "SECRET-RUNG-THREE" },
];

let problemSlug: string;
let problemId: string;

beforeEach(async () => {
  const problem = await createProblem();
  problemSlug = problem.slug;
  problemId = problem.id;
  await prisma.problemHint.createMany({
    data: RUNGS.map((rung, orderIndex) => ({ problemId, orderIndex, ...rung })),
  });
});

describe("GET /problems/:slug/hints", () => {
  it("describes the ladder without giving any of it away", async () => {
    const res = await request(app).get(`/problems/${problemSlug}/hints`);
    expect(res.status).toBe(200);
    expect(res.body.ladder.total).toBe(3);
    expect(res.body.ladder.revealedCount).toBe(0);

    // Labels are fine — they say what kind of help a rung offers. The
    // bodies are the thing being withheld, and withholding has to happen
    // here rather than in the UI, or it hasn't happened at all.
    expect(res.body.ladder.rungs.map((r: { label: string }) => r.label)).toEqual([
      "reframe",
      "the recurrence",
      "the full approach",
    ]);
    for (const secret of RUNGS.map((r) => r.body)) {
      expect(JSON.stringify(res.body)).not.toContain(secret);
    }
  });

  it("keeps unopened rungs hidden from a signed-in user too", async () => {
    const user = await createUser();
    await request(app)
      .post(`/problems/${problemSlug}/hints/reveal`)
      .set("Cookie", authCookie(user));

    const res = await request(app)
      .get(`/problems/${problemSlug}/hints`)
      .set("Cookie", authCookie(user));

    expect(JSON.stringify(res.body)).toContain("SECRET-RUNG-ONE");
    expect(JSON.stringify(res.body)).not.toContain("SECRET-RUNG-TWO");
    expect(JSON.stringify(res.body)).not.toContain("SECRET-RUNG-THREE");
  });
});

describe("POST /problems/:slug/hints/reveal", () => {
  it("requires a session", async () => {
    const res = await request(app).post(`/problems/${problemSlug}/hints/reveal`);
    expect(res.status).toBe(401);
  });

  it("opens rungs strictly in order", async () => {
    const user = await createUser();
    const cookie = authCookie(user);

    const first = await request(app).post(`/problems/${problemSlug}/hints/reveal`).set("Cookie", cookie);
    expect(first.body.ladder.revealedCount).toBe(1);
    expect(first.body.ladder.rungs[0].body).toBe("SECRET-RUNG-ONE");
    expect(first.body.ladder.rungs[1].body).toBeNull();

    const second = await request(app).post(`/problems/${problemSlug}/hints/reveal`).set("Cookie", cookie);
    expect(second.body.ladder.revealedCount).toBe(2);
    expect(second.body.ladder.rungs[1].body).toBe("SECRET-RUNG-TWO");
    // Still not the last one — no way to skip ahead to the answer.
    expect(second.body.ladder.rungs[2].body).toBeNull();
  });

  it("logs each reveal once, so a double click isn't two hints", async () => {
    const user = await createUser();
    const cookie = authCookie(user);
    await request(app).post(`/problems/${problemSlug}/hints/reveal`).set("Cookie", cookie);

    const reveals = await prisma.hintReveal.findMany({ where: { userId: user.id, problemId } });
    expect(reveals).toHaveLength(1);
    expect(reveals[0]!.orderIndex).toBe(0);
  });

  it("refuses once every rung is open", async () => {
    const user = await createUser();
    const cookie = authCookie(user);
    for (let i = 0; i < RUNGS.length; i++) {
      await request(app).post(`/problems/${problemSlug}/hints/reveal`).set("Cookie", cookie);
    }

    const extra = await request(app)
      .post(`/problems/${problemSlug}/hints/reveal`)
      .set("Cookie", cookie);
    expect(extra.status).toBe(404);
  });

  it("keeps one user's progress out of another's ladder", async () => {
    const climber = await createUser();
    const other = await createUser();
    await request(app)
      .post(`/problems/${problemSlug}/hints/reveal`)
      .set("Cookie", authCookie(climber));

    const res = await request(app)
      .get(`/problems/${problemSlug}/hints`)
      .set("Cookie", authCookie(other));

    expect(res.body.ladder.revealedCount).toBe(0);
    expect(JSON.stringify(res.body)).not.toContain("SECRET-RUNG-ONE");
  });
});
