import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authCookie, createProblem, createTestCase, createUser } from "../helpers/factories.js";
import { prisma } from "../../src/db/prisma.js";
import { submitQueue } from "../../src/queue/queues.js";

async function createSubmissionRow(userId: string, problemId: string, verdict = "ACCEPTED" as const) {
  return prisma.submission.create({
    data: { userId, problemId, language: "PYTHON", code: "print(3)", verdict },
  });
}

describe("POST /problems/:problemId/submissions", () => {
  it("rejects an unauthenticated submission", async () => {
    const problem = await createProblem();

    const res = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .send({ language: "PYTHON", code: "print(3)" });

    expect(res.status).toBe(401);
    expect(await prisma.submission.count()).toBe(0);
  });

  it("creates a PENDING submission and enqueues exactly one judging job", async () => {
    const user = await createUser();
    const problem = await createProblem();
    await createTestCase(problem.id);

    const res = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(user))
      .send({ language: "PYTHON", code: "print(3)" });

    // 202, not 201: judging is asynchronous, so the response acknowledges
    // the work rather than claiming a finished result exists.
    expect(res.status).toBe(202);
    const submission = await prisma.submission.findFirstOrThrow();
    expect(submission.verdict).toBe("PENDING");
    expect(submission.userId).toBe(user.id);
    expect(submitQueue.add).toHaveBeenCalledWith("submit", { submissionId: submission.id });
  });

  // Ownership comes from the verified cookie, never the request body.
  it("ignores a client-supplied userId and attributes the submission to the caller", async () => {
    const caller = await createUser();
    const victim = await createUser();
    const problem = await createProblem();

    await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(caller))
      .send({ language: "PYTHON", code: "print(3)", userId: victim.id });

    const submission = await prisma.submission.findFirstOrThrow();
    expect(submission.userId).toBe(caller.id);
  });

  it("refuses to accept a submission against an unpublished problem", async () => {
    const user = await createUser();
    const problem = await createProblem({ isPublished: false });

    const res = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(user))
      .send({ language: "PYTHON", code: "print(3)" });

    expect(res.status).toBe(404);
    expect(await prisma.submission.count()).toBe(0);
  });

  it("rejects an unsupported language", async () => {
    const user = await createUser();
    const problem = await createProblem();

    const res = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(user))
      .send({ language: "BRAINFUCK", code: "+++." });

    expect(res.status).toBe(400);
  });
});

describe("GET /submissions/:id", () => {
  it("lets the owner read their own submission", async () => {
    const user = await createUser();
    const problem = await createProblem();
    const submission = await createSubmissionRow(user.id, problem.id);

    const res = await request(app)
      .get(`/submissions/${submission.id}`)
      .set("Cookie", authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.submission.id).toBe(submission.id);
  });

  it("forbids reading someone else's submission", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const problem = await createProblem();
    const submission = await createSubmissionRow(owner.id, problem.id);

    const res = await request(app)
      .get(`/submissions/${submission.id}`)
      .set("Cookie", authCookie(stranger));

    expect(res.status).toBe(403);
  });

  it("lets an admin read any submission", async () => {
    const owner = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const problem = await createProblem();
    const submission = await createSubmissionRow(owner.id, problem.id);

    const res = await request(app)
      .get(`/submissions/${submission.id}`)
      .set("Cookie", authCookie(admin));

    expect(res.status).toBe(200);
  });

  // TestCaseResult has no input/output columns by design; this guards that
  // property against someone "helpfully" adding them later.
  it("never includes hidden test case content in a submission response", async () => {
    const user = await createUser();
    const problem = await createProblem();
    const testCase = await createTestCase(problem.id, {
      isHidden: true,
      input: "SECRET_INPUT",
      expectedOutput: "SECRET_OUTPUT",
    });
    const submission = await createSubmissionRow(user.id, problem.id);
    await prisma.testCaseResult.create({
      data: {
        submissionId: submission.id,
        testCaseId: testCase.id,
        orderIndex: 0,
        verdict: "WRONG_ANSWER",
      },
    });

    const res = await request(app)
      .get(`/submissions/${submission.id}`)
      .set("Cookie", authCookie(user));

    const body = JSON.stringify(res.body);
    expect(res.body.submission.results).toHaveLength(1);
    expect(body).not.toContain("SECRET_INPUT");
    expect(body).not.toContain("SECRET_OUTPUT");
  });
});

describe("GET /submissions", () => {
  it("returns only the caller's own submissions", async () => {
    const user = await createUser();
    const other = await createUser();
    const problem = await createProblem();
    await createSubmissionRow(user.id, problem.id);
    await createSubmissionRow(other.id, problem.id);

    const res = await request(app).get("/submissions").set("Cookie", authCookie(user));

    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  // A non-admin passing ?userId= must not be able to read another user's
  // history — the parameter is honored for admins only.
  it("ignores ?userId= for a non-admin", async () => {
    const user = await createUser();
    const other = await createUser();
    const problem = await createProblem();
    await createSubmissionRow(other.id, problem.id);

    const res = await request(app)
      .get(`/submissions?userId=${other.id}`)
      .set("Cookie", authCookie(user));

    expect(res.body.items).toHaveLength(0);
  });

  it("honors ?userId= for an admin", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const other = await createUser();
    const problem = await createProblem();
    await createSubmissionRow(other.id, problem.id);

    const res = await request(app)
      .get(`/submissions?userId=${other.id}`)
      .set("Cookie", authCookie(admin));

    expect(res.body.items).toHaveLength(1);
  });

  it("requires authentication", async () => {
    expect((await request(app).get("/submissions")).status).toBe(401);
  });
});
