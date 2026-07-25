import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authCookie, createProblem, createTestCase, createUser } from "../helpers/factories.js";
import { prisma } from "../../src/db/prisma.js";

describe("GET /problems", () => {
  it("lists published problems", async () => {
    await createProblem({ title: "Visible", isPublished: true });

    const res = await request(app).get("/problems");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe("Visible");
  });

  it("never exposes unpublished problems to the public list", async () => {
    await createProblem({ title: "Draft", isPublished: false });

    const res = await request(app).get("/problems");

    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("filters by difficulty", async () => {
    const easy = await createProblem();
    const hard = await createProblem();
    await prisma.problem.update({ where: { id: hard.id }, data: { difficulty: "HARD" } });

    const res = await request(app).get("/problems?difficulty=HARD");

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(hard.id);
    expect(res.body.items[0].id).not.toBe(easy.id);
  });

  it("rejects an invalid difficulty rather than ignoring it", async () => {
    expect((await request(app).get("/problems?difficulty=IMPOSSIBLE")).status).toBe(400);
  });
});

describe("GET /problems/:slug", () => {
  it("returns a published problem with only its non-hidden test cases", async () => {
    const problem = await createProblem({ slug: "sum-two" });
    await createTestCase(problem.id, { isHidden: false, input: "1 2", expectedOutput: "3" });
    await createTestCase(problem.id, {
      isHidden: true,
      input: "SECRET_INPUT",
      expectedOutput: "SECRET_OUTPUT",
    });

    const res = await request(app).get("/problems/sum-two");

    expect(res.status).toBe(200);
    expect(res.body.problem.sampleTestCases).toHaveLength(1);
    expect(res.body.problem.sampleTestCases[0].input).toBe("1 2");
  });

  // The whole point of hidden test cases — if these leak, every problem is
  // trivially solvable by hard-coding the expected output.
  it("never leaks hidden test case content anywhere in the response", async () => {
    const problem = await createProblem({ slug: "sum-two" });
    await createTestCase(problem.id, {
      isHidden: true,
      input: "SECRET_INPUT",
      expectedOutput: "SECRET_OUTPUT",
    });

    const res = await request(app).get("/problems/sum-two");
    const body = JSON.stringify(res.body);

    expect(body).not.toContain("SECRET_INPUT");
    expect(body).not.toContain("SECRET_OUTPUT");
  });

  it("404s an unpublished problem rather than revealing it exists", async () => {
    await createProblem({ slug: "draft-problem", isPublished: false });

    expect((await request(app).get("/problems/draft-problem")).status).toBe(404);
  });
});

describe("admin problem routes", () => {
  it("rejects an unauthenticated caller with 401", async () => {
    expect((await request(app).get("/admin/problems")).status).toBe(401);
  });

  it("rejects an authenticated non-admin with 403", async () => {
    const user = await createUser({ role: "USER" });

    const res = await request(app).get("/admin/problems").set("Cookie", authCookie(user));

    expect(res.status).toBe(403);
  });

  it("allows an admin, including seeing unpublished problems", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createProblem({ title: "Draft", isPublished: false });

    const res = await request(app).get("/admin/problems").set("Cookie", authCookie(admin));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("does not let a non-admin create a problem", async () => {
    const user = await createUser({ role: "USER" });

    const res = await request(app)
      .post("/admin/problems")
      .set("Cookie", authCookie(user))
      .send({ title: "Sneaky", statement: "...", difficulty: "EASY" });

    expect(res.status).toBe(403);
    expect(await prisma.problem.count()).toBe(0);
  });

  it("lets an admin create a problem and derives a slug", async () => {
    const admin = await createUser({ role: "ADMIN" });

    const res = await request(app)
      .post("/admin/problems")
      .set("Cookie", authCookie(admin))
      .send({ title: "Two Sum!", statement: "Find two numbers.", difficulty: "EASY" });

    expect(res.status).toBe(201);
    expect(res.body.problem.slug).toBe("two-sum");
  });

  it("keeps the slug stable when the title is edited, so links do not break", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const problem = await createProblem({ slug: "original-slug" });

    const res = await request(app)
      .put(`/admin/problems/${problem.id}`)
      .set("Cookie", authCookie(admin))
      .send({ title: "Completely Different Title" });

    expect(res.status).toBe(200);
    expect(res.body.problem.slug).toBe("original-slug");
  });
});
