# Invariant — Online Judge

A full-stack competitive programming judge: write code in the browser, run it
against your own input, submit it to a sandboxed grader, and see exactly
which hidden test case broke — plus a contest system, a diagnostics page
that explains *why* you keep failing, and a prerequisite graph for what to
learn next.

**Live:** https://140.245.211.182.sslip.io
*(the free-tier host it runs on has 1 GB of RAM — give the first judge a few seconds)*

---

## What it does

**The judge**
- C, C++, Java and Python, compiled and run inside a locked-down Docker
  container per submission — no network, read-only filesystem, a hard
  memory ceiling, and every Linux capability dropped.
- Two modes: **Run** against your own input to sanity-check an idea, or
  **Submit** to grade against the problem's full test suite, most of which
  stays hidden.
- Verdicts are specific: which case failed, how long it ran, whether it
  was wrong, slow, or over the memory limit — not just pass/fail.

**Contests**
- Timed rounds with ICPC-style scoring: ranked by problems solved, ties
  broken on penalty time (solve time + 20 minutes per wrong attempt before
  the accept). Problems are hidden before the round starts and gated on
  registration while it's running.

**Roadmap**
- The problem tags form a directed graph of prerequisites — 31 concepts,
  37 edges, e.g. *lazy propagation* requires *segment trees*, which
  requires *trees* and *prefix sums*. Pick a target and get a route built
  from what you've actually demonstrated, skipping what you've mastered
  and routing you back through anything that's gone stale.

**Progress analytics**
- Why you fail (verdict breakdown over the last 90 days), how long you
  take (time from first attempt to first accept, not from the accepted
  submission), and tag mastery that decays if you stop practising a topic
  — all computed from real submission history, nothing invented.

**Stuck ladder**
- Graduated hints per problem, from a reframe to the full approach.
  Opened one at a time, logged rather than charged — a solve that needed
  every hint stays distinguishable from one that didn't.

**Accounts**
- Registration requires a 6-digit emailed code before you can run or
  submit code — not just a link you can ignore.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router, Monaco Editor |
| API | Node.js, Express, TypeScript |
| Judge worker | BullMQ (Redis-backed queue), Dockerode |
| Database | PostgreSQL, Prisma ORM |
| Validation | Zod — one schema package shared by client and server, so a request can't be malformed and silently accepted by one side and rejected by the other |
| Sandbox | Docker (per-submission containers for C/C++/Java/Python) |
| Deployment | Docker Compose, Caddy (automatic HTTPS), nginx |
| Testing | Vitest, Supertest — integration tests against a real Postgres, not mocks |

Everything is TypeScript end to end, including the database schema
(Prisma) and the request/response contracts (Zod), so a field renamed on
the server is a compile error on the client, not a runtime surprise.

---

## Concepts and techniques this project exercises

**Systems / security**
- Container sandboxing: seccomp-adjacent isolation via `NetworkDisabled`,
  `ReadonlyRootfs`, `CapDrop: ALL`, `PidsLimit`, and a memory limit with
  swap capped equal to RAM (so a process can't dodge the limit by
  swapping).
- Asynchronous job processing — the API never executes untrusted code
  itself; it enqueues a job and answers immediately, so a fork bomb in a
  submission can't take the web tier down with it.
- Authentication: bcrypt password hashing (cost 12), JWT in an httpOnly
  cookie, OTP email verification with hashed codes and a capped guess
  count, and a constant-time comparison on login so a wrong password and
  an unregistered email take the same amount of time to reject —
  otherwise the response timing itself would leak which emails exist.
- Rate limiting keyed by user ID (not IP) for the judge endpoints, and a
  configurable trusted-proxy hop count so requests behind a reverse proxy
  are rate-limited by real client IP instead of the proxy's.

**Data & algorithms**
- Directed acyclic graph modelling for the concept roadmap: longest-path
  depth for layout (so every prerequisite edge points the same direction
  visually), and a route-finding walk that skips demonstrated
  prerequisites while still routing through ones that have gone stale.
- Exponential decay for both contest-tag mastery and roadmap recall — a
  solve's contribution halves on a fixed half-life, so the numbers
  reflect current strength, not lifetime totals.
- ICPC-style ranking (solved-count primary key, penalty-time tiebreak)
  computed directly from submission history rather than a stored score.

**Engineering practice**
- A monorepo with a shared package (`shared/`) so validation schemas and
  TypeScript types are defined once and used by both the browser and the
  server.
- Every new feature in this codebase shipped with integration tests run
  against a real, migrated Postgres database — not a mocked one — so a
  passing suite means the actual queries work.
- Infrastructure as code: the entire production stack (Postgres, Redis,
  API, worker, static frontend, TLS-terminating proxy) is one
  `docker-compose.prod.yml`, brought up with a single deploy script that
  ships the current commit, rebuilds, migrates, restarts, and only
  reports success once the live site has actually answered a health
  check — not just because the commands exited zero.

---

## Project structure

```
client/   React + TypeScript frontend (Vite, Tailwind, Monaco, React Query)
server/   Express API + judging worker (Prisma/Postgres, BullMQ/Redis)
shared/   Zod schemas and TypeScript types used by both
```

---

## Local development

Prerequisites: Node.js 22+, Docker Desktop, Git.

```bash
npm install
cp server/.env.example server/.env   # fill in real values — see comments in the file
npm run dev
```

That last command starts Postgres and Redis, waits for them to be
healthy, then runs the API, the judge worker, and the Vite dev server
together in one terminal.

Build the judge's sandbox images once — required before Run/Submit will
work locally:

```bash
npm run docker:build -w server
```

Apply migrations and seed sample problems (optional, but Run/Submit has
nothing to grade against otherwise):

```bash
npm run prisma:migrate -w server
npm run seed -w server
```

Create a local admin account (skipped unless this is set — there's no
default password):

```bash
SEED_ADMIN_PASSWORD=your-local-password npm run seed -w server
```

## Testing

```bash
npm test
```

Integration tests run against a real Postgres. They create and migrate
their own `online_judge_test` database, so the dev database is untouched —
just make sure `npm run db:up` (or `npm run dev`) has Postgres running.

## Deploying

```bash
./deploy.sh
```

Ships the current commit, rebuilds the images, applies migrations, and
restarts — see [DEPLOYMENT.md](DEPLOYMENT.md) for the full topology and
[DEPLOY-ORACLE.md](DEPLOY-ORACLE.md) for a worked example on a free-tier
host, including the parts that only bite on a 1 GB machine. Read the note
in DEPLOYMENT.md about the worker and the Docker socket before putting
this on a shared host.

## Design notes

See [PLAN.md](PLAN.md) for the milestone sequence and the reasoning
behind the sandbox's constraints.
