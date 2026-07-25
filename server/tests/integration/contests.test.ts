import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  addProblemToContest,
  app,
  authCookie,
  createContest,
  createProblem,
  createTestCase,
  createUser,
  registerFor,
} from "../helpers/factories.js";
import { prisma } from "../../src/db/prisma.js";

describe("GET /contests", () => {
  it("lists published contests with a derived status", async () => {
    await createContest({ when: "running", title: "Live Round" });

    const res = await request(app).get("/contests");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ title: "Live Round", status: "RUNNING" });
  });

  it("hides unpublished contests from the public list", async () => {
    await createContest({ isPublished: false });

    expect((await request(app).get("/contests")).body.items).toHaveLength(0);
  });

  it("filters by status", async () => {
    await createContest({ when: "upcoming" });
    await createContest({ when: "ended" });

    const upcoming = await request(app).get("/contests?status=UPCOMING");
    const ended = await request(app).get("/contests?status=ENDED");

    expect(upcoming.body.items).toHaveLength(1);
    expect(upcoming.body.items[0].status).toBe("UPCOMING");
    expect(ended.body.items).toHaveLength(1);
    expect(ended.body.items[0].status).toBe("ENDED");
  });

  it("reports registration state for the signed-in caller only", async () => {
    const user = await createUser();
    const other = await createUser();
    const contest = await createContest();
    await registerFor(contest.id, other.id);

    const anonymous = await request(app).get("/contests");
    const asUser = await request(app).get("/contests").set("Cookie", authCookie(user));
    await registerFor(contest.id, user.id);
    const afterRegistering = await request(app).get("/contests").set("Cookie", authCookie(user));

    expect(anonymous.body.items[0].isRegistered).toBe(false);
    expect(asUser.body.items[0].isRegistered).toBe(false);
    expect(afterRegistering.body.items[0].isRegistered).toBe(true);
  });
});

describe("GET /contests/:slug", () => {
  // The problem set is part of what a contest reveals at start time.
  it("withholds the problem list before the contest starts", async () => {
    const contest = await createContest({ slug: "future", when: "upcoming" });
    const problem = await createProblem({ title: "Secret Problem" });
    await addProblemToContest(contest.id, problem.id);

    const res = await request(app).get("/contests/future");

    expect(res.status).toBe(200);
    expect(res.body.contest.problems).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain("Secret Problem");
  });

  it("reveals the problem list once running", async () => {
    const contest = await createContest({ slug: "live", when: "running" });
    const problem = await createProblem({ title: "Now Visible" });
    await addProblemToContest(contest.id, problem.id, { label: "A" });

    const res = await request(app).get("/contests/live");

    expect(res.body.contest.problems).toHaveLength(1);
    expect(res.body.contest.problems[0].label).toBe("A");
  });

  it("404s an unpublished contest", async () => {
    await createContest({ slug: "hidden", isPublished: false });

    expect((await request(app).get("/contests/hidden")).status).toBe(404);
  });
});

describe("GET /contests/:slug/problems/:label", () => {
  async function setup(when: "upcoming" | "running" | "ended") {
    const contest = await createContest({ slug: "c", when });
    // Unpublished on purpose: a contest problem's statement is served
    // through the contest routes, not the public problem pool.
    const problem = await createProblem({ title: "Contest Problem", isPublished: false });
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    await createTestCase(problem.id, { isHidden: false, input: "1 2", expectedOutput: "3" });
    await createTestCase(problem.id, {
      isHidden: true,
      input: "SECRET_INPUT",
      expectedOutput: "SECRET_OUTPUT",
    });
    return { contest, problem };
  }

  it("hides an upcoming contest's problem even from a registered user", async () => {
    const { contest } = await setup("upcoming");
    const user = await createUser();
    await registerFor(contest.id, user.id);

    const res = await request(app).get("/contests/c/problems/A").set("Cookie", authCookie(user));

    expect(res.status).toBe(404);
  });

  it("refuses an unregistered user during a running contest", async () => {
    await setup("running");
    const user = await createUser();

    const res = await request(app).get("/contests/c/problems/A").set("Cookie", authCookie(user));

    expect(res.status).toBe(403);
  });

  it("serves a registered user during a running contest", async () => {
    const { contest } = await setup("running");
    const user = await createUser();
    await registerFor(contest.id, user.id);

    const res = await request(app).get("/contests/c/problems/A").set("Cookie", authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.contestProblem.problem.title).toBe("Contest Problem");
  });

  it("is public once the contest has ended", async () => {
    await setup("ended");

    const res = await request(app).get("/contests/c/problems/A");

    expect(res.status).toBe(200);
  });

  it("never leaks hidden test cases through the contest route", async () => {
    const { contest } = await setup("running");
    const user = await createUser();
    await registerFor(contest.id, user.id);

    const res = await request(app).get("/contests/c/problems/A").set("Cookie", authCookie(user));

    const body = JSON.stringify(res.body);
    expect(res.body.contestProblem.problem.sampleTestCases).toHaveLength(1);
    expect(body).not.toContain("SECRET_INPUT");
    expect(body).not.toContain("SECRET_OUTPUT");
  });
});

describe("POST /contests/:slug/register", () => {
  it("registers the caller", async () => {
    const user = await createUser();
    await createContest({ slug: "open" });

    const res = await request(app).post("/contests/open/register").set("Cookie", authCookie(user));

    expect(res.status).toBe(204);
    expect(await prisma.contestRegistration.count()).toBe(1);
  });

  it("is idempotent rather than erroring on a double registration", async () => {
    const user = await createUser();
    await createContest({ slug: "open" });

    await request(app).post("/contests/open/register").set("Cookie", authCookie(user));
    const second = await request(app)
      .post("/contests/open/register")
      .set("Cookie", authCookie(user));

    expect(second.status).toBe(204);
    expect(await prisma.contestRegistration.count()).toBe(1);
  });

  it("requires authentication", async () => {
    await createContest({ slug: "open" });

    expect((await request(app).post("/contests/open/register")).status).toBe(401);
  });

  it("refuses registration for a finished contest", async () => {
    const user = await createUser();
    await createContest({ slug: "over", when: "ended" });

    const res = await request(app).post("/contests/over/register").set("Cookie", authCookie(user));

    expect(res.status).toBe(409);
  });
});

describe("contest submissions", () => {
  async function runningContestWithProblem() {
    const contest = await createContest({ when: "running" });
    const problem = await createProblem({ isPublished: false });
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    return { contest, problem };
  }

  it("tags the submission with the contest", async () => {
    const { contest, problem } = await runningContestWithProblem();
    const user = await createUser();
    await registerFor(contest.id, user.id);

    const res = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(user))
      .send({ language: "PYTHON", code: "print(3)", contestId: contest.id });

    expect(res.status).toBe(202);
    const submission = await prisma.submission.findFirstOrThrow();
    expect(submission.contestId).toBe(contest.id);
  });

  it("refuses a submission from someone who never registered", async () => {
    const { contest, problem } = await runningContestWithProblem();
    const user = await createUser();

    const res = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(user))
      .send({ language: "PYTHON", code: "print(3)", contestId: contest.id });

    expect(res.status).toBe(403);
    expect(await prisma.submission.count()).toBe(0);
  });

  it("refuses a submission after the contest has ended", async () => {
    const contest = await createContest({ when: "ended" });
    const problem = await createProblem({ isPublished: false });
    await addProblemToContest(contest.id, problem.id);
    const user = await createUser();
    await registerFor(contest.id, user.id);

    const res = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(user))
      .send({ language: "PYTHON", code: "print(3)", contestId: contest.id });

    expect(res.status).toBe(403);
  });

  it("refuses a problem that is not part of the contest", async () => {
    const { contest } = await runningContestWithProblem();
    const unrelated = await createProblem();
    const user = await createUser();
    await registerFor(contest.id, user.id);

    const res = await request(app)
      .post(`/problems/${unrelated.id}/submissions`)
      .set("Cookie", authCookie(user))
      .send({ language: "PYTHON", code: "print(3)", contestId: contest.id });

    expect(res.status).toBe(404);
  });

  // Without a contestId the normal rules apply, and an unpublished contest
  // problem must not become submittable just by omitting it.
  it("still refuses an unpublished problem submitted outside a contest", async () => {
    const { problem } = await runningContestWithProblem();
    const user = await createUser();

    const res = await request(app)
      .post(`/problems/${problem.id}/submissions`)
      .set("Cookie", authCookie(user))
      .send({ language: "PYTHON", code: "print(3)" });

    expect(res.status).toBe(404);
  });
});

describe("admin contest routes", () => {
  it("rejects a non-admin", async () => {
    const user = await createUser({ role: "USER" });

    expect((await request(app).get("/admin/contests").set("Cookie", authCookie(user))).status).toBe(
      403,
    );
  });

  it("lets an admin create a contest and derives a slug", async () => {
    const admin = await createUser({ role: "ADMIN" });

    const res = await request(app)
      .post("/admin/contests")
      .set("Cookie", authCookie(admin))
      .send({
        title: "Winter Round 1",
        startsAt: new Date(Date.now() + 3600_000).toISOString(),
        endsAt: new Date(Date.now() + 7200_000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.contest.slug).toBe("winter-round-1");
  });

  it("rejects a contest that ends before it starts", async () => {
    const admin = await createUser({ role: "ADMIN" });

    const res = await request(app)
      .post("/admin/contests")
      .set("Cookie", authCookie(admin))
      .send({
        title: "Backwards",
        startsAt: new Date(Date.now() + 7200_000).toISOString(),
        endsAt: new Date(Date.now() + 3600_000).toISOString(),
      });

    expect(res.status).toBe(400);
  });

  it("rejects a duplicate label within one contest", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const contest = await createContest();
    const first = await createProblem();
    const second = await createProblem();
    await addProblemToContest(contest.id, first.id, { label: "A" });

    const res = await request(app)
      .post(`/admin/contests/${contest.id}/problems`)
      .set("Cookie", authCookie(admin))
      .send({ problemId: second.id, label: "A" });

    expect(res.status).toBe(409);
  });

  it("rejects adding the same problem twice", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const contest = await createContest();
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });

    const res = await request(app)
      .post(`/admin/contests/${contest.id}/problems`)
      .set("Cookie", authCookie(admin))
      .send({ problemId: problem.id, label: "B" });

    expect(res.status).toBe(409);
  });
});
