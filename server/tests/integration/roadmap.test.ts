import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authCookie, createUser } from "../helpers/factories.js";
import { prisma } from "../../src/db/prisma.js";

/**
 * A deliberately small graph, built per test:
 *
 *   arrays ──► sorting ──► binary-search
 *      └─────► hashing
 *
 * Small enough that every assertion about ordering is checkable by eye,
 * which the real 31-concept graph is not.
 */
async function buildGraph() {
  const make = (slug: string, name: string) =>
    prisma.concept.create({ data: { slug, name, blurb: `${name} blurb` } });

  const arrays = await make("arrays", "Arrays");
  const sorting = await make("sorting", "Sorting");
  const search = await make("binary-search", "Binary search");
  const hashing = await make("hashing", "Hashing");

  await prisma.conceptEdge.createMany({
    data: [
      { prerequisiteId: arrays.id, dependentId: sorting.id },
      { prerequisiteId: sorting.id, dependentId: search.id },
      { prerequisiteId: arrays.id, dependentId: hashing.id },
    ],
  });

  return { arrays, sorting, search, hashing };
}

async function problemTagged(tags: string[], slug: string) {
  return prisma.problem.create({
    data: {
      slug,
      title: slug,
      statement: "s",
      difficulty: "EASY",
      tags,
      isPublished: true,
    },
  });
}

async function solve(userId: string, problemId: string, daysAgo = 1) {
  return prisma.submission.create({
    data: {
      userId,
      problemId,
      language: "PYTHON",
      code: "x",
      verdict: "ACCEPTED",
      createdAt: new Date(Date.now() - daysAgo * 86_400_000),
    },
  });
}

describe("GET /roadmap", () => {
  beforeEach(buildGraph);

  it("is readable signed out, with everything unseen", async () => {
    const res = await request(app).get("/roadmap");
    expect(res.status).toBe(200);
    expect(res.body.roadmap.concepts).toHaveLength(4);
    expect(res.body.roadmap.demonstratedCount).toBe(0);
    expect(res.body.roadmap.concepts.every((c: { mastery: string }) => c.mastery === "unseen")).toBe(
      true,
    );
  });

  it("places a concept deeper than everything it requires", async () => {
    const res = await request(app).get("/roadmap");
    const depth = (slug: string) =>
      res.body.roadmap.concepts.find((c: { slug: string }) => c.slug === slug).depth;

    expect(depth("arrays")).toBe(0);
    expect(depth("sorting")).toBe(1);
    expect(depth("hashing")).toBe(1);
    expect(depth("binary-search")).toBe(2);
  });

  it("turns solves of tagged problems into demonstrated concepts", async () => {
    const user = await createUser();
    const problem = await problemTagged(["arrays"], "p-arrays");
    await solve(user.id, problem.id);

    const res = await request(app).get("/roadmap").set("Cookie", authCookie(user));
    const arrays = res.body.roadmap.concepts.find((c: { slug: string }) => c.slug === "arrays");

    expect(arrays.solved).toBe(1);
    expect(arrays.mastery).not.toBe("unseen");
    expect(res.body.roadmap.demonstratedCount).toBe(1);
  });

  it("rates an old solve as shaky and a recent streak as mastered", async () => {
    const user = await createUser();

    // Three recent solves of arrays…
    for (let i = 0; i < 3; i++) {
      const p = await problemTagged(["arrays"], `p-arrays-${i}`);
      await solve(user.id, p.id, 1);
    }
    // …against one hashing solve from well over a year ago.
    const stale = await problemTagged(["hashing"], "p-hashing-old");
    await solve(user.id, stale.id, 500);

    const res = await request(app).get("/roadmap").set("Cookie", authCookie(user));
    const find = (slug: string) =>
      res.body.roadmap.concepts.find((c: { slug: string }) => c.slug === slug);

    expect(find("arrays").mastery).toBe("mastered");
    expect(find("hashing").mastery).toBe("shaky");
    // Same knowledge, different age — that's the whole point of the tier.
    expect(find("hashing").recall).toBeLessThan(find("arrays").recall);
  });

  it("reports how many problems can teach each concept", async () => {
    await problemTagged(["arrays"], "p1");
    await problemTagged(["arrays", "sorting"], "p2");

    const res = await request(app).get("/roadmap");
    const find = (slug: string) =>
      res.body.roadmap.concepts.find((c: { slug: string }) => c.slug === slug);

    expect(find("arrays").available).toBe(2);
    expect(find("sorting").available).toBe(1);
    expect(find("binary-search").available).toBe(0);
  });
});

describe("GET /roadmap/route/:slug", () => {
  beforeEach(buildGraph);

  it("orders prerequisites before what depends on them", async () => {
    const res = await request(app).get("/roadmap/route/binary-search");
    expect(res.status).toBe(200);

    const order = res.body.route.steps.map((s: { slug: string }) => s.slug);
    expect(order).toEqual(["arrays", "sorting", "binary-search"]);
    // Nothing off the path to the target.
    expect(order).not.toContain("hashing");
  });

  it("skips a prerequisite the user has already mastered", async () => {
    const user = await createUser();
    for (let i = 0; i < 3; i++) {
      const p = await problemTagged(["arrays"], `p-arrays-${i}`);
      await solve(user.id, p.id, 1);
    }

    const res = await request(app).get("/roadmap/route/binary-search").set("Cookie", authCookie(user));
    const order = res.body.route.steps.map((s: { slug: string }) => s.slug);

    // Arrays is demonstrated, so the route starts at what's actually left.
    expect(order).toEqual(["sorting", "binary-search"]);
  });

  it("still routes through a prerequisite that has gone shaky", async () => {
    const user = await createUser();
    const stale = await problemTagged(["arrays"], "p-arrays-old");
    await solve(user.id, stale.id, 500);

    const res = await request(app).get("/roadmap/route/binary-search").set("Cookie", authCookie(user));
    const order = res.body.route.steps.map((s: { slug: string }) => s.slug);

    // Solved once, long ago — exactly what a route should send you back through.
    expect(order).toContain("arrays");
  });

  it("names steps nothing can teach yet rather than dropping them", async () => {
    await problemTagged(["arrays"], "p-arrays");

    const res = await request(app).get("/roadmap/route/binary-search");
    // arrays has a problem; sorting and binary-search have none.
    expect(res.body.route.unreachable).toEqual(["sorting", "binary-search"]);
  });

  it("404s for a concept that doesn't exist", async () => {
    const res = await request(app).get("/roadmap/route/not-a-concept");
    expect(res.status).toBe(404);
  });
});
