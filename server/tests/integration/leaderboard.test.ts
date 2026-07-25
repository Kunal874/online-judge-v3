import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  addProblemToContest,
  app,
  createContest,
  createContestSubmission,
  createProblem,
  createUser,
  registerFor,
} from "../helpers/factories.js";
import { prisma } from "../../src/db/prisma.js";

const MINUTE = 60_000;

// A contest that started an hour ago and is still running, so "minute N"
// timestamps below are unambiguous.
async function contestStartedMinutesAgo(minutes: number) {
  const startsAt = new Date(Date.now() - minutes * MINUTE);
  const endsAt = new Date(startsAt.getTime() + 180 * MINUTE);
  return createContest({ slug: "scored", startsAt, endsAt });
}

function atMinute(startsAt: Date, minute: number) {
  return new Date(startsAt.getTime() + minute * MINUTE);
}

describe("GET /contests/:slug/leaderboard", () => {
  it("lists registered users even before anyone submits", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const user = await createUser({ handle: "alice" });
    await registerFor(contest.id, user.id);

    const res = await request(app).get("/contests/scored/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0]).toMatchObject({ rank: 1, handle: "alice", solvedCount: 0, penalty: 0 });
  });

  it("scores a clean first-try solve as the minute it was solved", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    const user = await createUser({ handle: "alice" });
    await registerFor(contest.id, user.id);
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "ACCEPTED",
      atMinute(contest.startsAt, 12),
    );

    const res = await request(app).get("/contests/scored/leaderboard");

    expect(res.body.rows[0]).toMatchObject({ solvedCount: 1, penalty: 12 });
    expect(res.body.rows[0].problems[0]).toMatchObject({
      label: "A",
      solved: true,
      solvedAtMinute: 12,
    });
  });

  // ICPC rule: 20 minutes per rejected attempt, but only on problems that
  // are eventually solved.
  it("adds 20 penalty minutes per rejected attempt before the solve", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    const user = await createUser({ handle: "alice" });
    await registerFor(contest.id, user.id);
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "WRONG_ANSWER",
      atMinute(contest.startsAt, 5),
    );
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "RUNTIME_ERROR",
      atMinute(contest.startsAt, 8),
    );
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "ACCEPTED",
      atMinute(contest.startsAt, 12),
    );

    const res = await request(app).get("/contests/scored/leaderboard");

    // 12 (solve time) + 2 rejections * 20
    expect(res.body.rows[0]).toMatchObject({ solvedCount: 1, penalty: 52 });
  });

  it("charges nothing for failed attempts on a problem never solved", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    const user = await createUser({ handle: "alice" });
    await registerFor(contest.id, user.id);
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "WRONG_ANSWER",
      atMinute(contest.startsAt, 5),
    );

    const res = await request(app).get("/contests/scored/leaderboard");

    expect(res.body.rows[0]).toMatchObject({ solvedCount: 0, penalty: 0 });
    expect(res.body.rows[0].problems[0]).toMatchObject({ solved: false, attempts: 1 });
  });

  it("does not penalize rejections that came after the solve", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    const user = await createUser({ handle: "alice" });
    await registerFor(contest.id, user.id);
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "ACCEPTED",
      atMinute(contest.startsAt, 10),
    );
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "WRONG_ANSWER",
      atMinute(contest.startsAt, 20),
    );

    expect((await request(app).get("/contests/scored/leaderboard")).body.rows[0].penalty).toBe(10);
  });

  // A queued submission hasn't been judged wrong yet, so counting it would
  // penalize someone for the judge being slow.
  it("does not penalize a still-pending submission", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    const user = await createUser({ handle: "alice" });
    await registerFor(contest.id, user.id);
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "PENDING",
      atMinute(contest.startsAt, 5),
    );
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "ACCEPTED",
      atMinute(contest.startsAt, 9),
    );

    expect((await request(app).get("/contests/scored/leaderboard")).body.rows[0].penalty).toBe(9);
  });

  it("ranks by solve count first, then by lower penalty", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const a = await createProblem();
    const b = await createProblem();
    await addProblemToContest(contest.id, a.id, { label: "A", orderIndex: 0 });
    await addProblemToContest(contest.id, b.id, { label: "B", orderIndex: 1 });

    const twoSolves = await createUser({ handle: "carol" });
    const fastOneSolve = await createUser({ handle: "alice" });
    const slowOneSolve = await createUser({ handle: "bob" });
    for (const user of [twoSolves, fastOneSolve, slowOneSolve]) {
      await registerFor(contest.id, user.id);
    }

    // carol: 2 solves, high penalty — still ranks first on solve count.
    await createContestSubmission(contest.id, twoSolves.id, a.id, "ACCEPTED", atMinute(contest.startsAt, 50));
    await createContestSubmission(contest.id, twoSolves.id, b.id, "ACCEPTED", atMinute(contest.startsAt, 55));
    await createContestSubmission(contest.id, fastOneSolve.id, a.id, "ACCEPTED", atMinute(contest.startsAt, 5));
    await createContestSubmission(contest.id, slowOneSolve.id, a.id, "ACCEPTED", atMinute(contest.startsAt, 40));

    const res = await request(app).get("/contests/scored/leaderboard");

    expect(res.body.rows.map((r: { handle: string }) => r.handle)).toEqual([
      "carol",
      "alice",
      "bob",
    ]);
    expect(res.body.rows.map((r: { rank: number }) => r.rank)).toEqual([1, 2, 3]);
  });

  it("ignores submissions that were not made in this contest", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    const user = await createUser({ handle: "alice" });
    await registerFor(contest.id, user.id);

    // Same user, same problem, accepted — but practice, not contest.
    await prisma.submission.create({
      data: {
        userId: user.id,
        problemId: problem.id,
        language: "PYTHON",
        code: "print(3)",
        verdict: "ACCEPTED",
      },
    });

    expect((await request(app).get("/contests/scored/leaderboard")).body.rows[0].solvedCount).toBe(
      0,
    );
  });

  // Guards against an admin shifting the window later and silently pulling
  // unrelated submissions into the standings.
  it("ignores tagged submissions that fall outside the contest window", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    const user = await createUser({ handle: "alice" });
    await registerFor(contest.id, user.id);
    await createContestSubmission(
      contest.id,
      user.id,
      problem.id,
      "ACCEPTED",
      new Date(contest.startsAt.getTime() - 5 * MINUTE),
    );

    expect((await request(app).get("/contests/scored/leaderboard")).body.rows[0].solvedCount).toBe(
      0,
    );
  });

  it("excludes users who never registered, even if they somehow submitted", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const problem = await createProblem();
    await addProblemToContest(contest.id, problem.id, { label: "A" });
    const stranger = await createUser({ handle: "stranger" });
    await createContestSubmission(
      contest.id,
      stranger.id,
      problem.id,
      "ACCEPTED",
      atMinute(contest.startsAt, 10),
    );

    expect((await request(app).get("/contests/scored/leaderboard")).body.rows).toHaveLength(0);
  });

  it("returns a column per contest problem, in order", async () => {
    const contest = await contestStartedMinutesAgo(60);
    const a = await createProblem();
    const b = await createProblem();
    await addProblemToContest(contest.id, b.id, { label: "B", orderIndex: 1 });
    await addProblemToContest(contest.id, a.id, { label: "A", orderIndex: 0 });
    const user = await createUser();
    await registerFor(contest.id, user.id);

    const res = await request(app).get("/contests/scored/leaderboard");

    expect(res.body.labels).toEqual(["A", "B"]);
    expect(res.body.rows[0].problems.map((p: { label: string }) => p.label)).toEqual(["A", "B"]);
  });
});
