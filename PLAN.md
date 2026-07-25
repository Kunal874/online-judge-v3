# Project plan

A full-stack online judge: write code in the browser, run it against test
cases in a sandbox, get a verdict.

M1–M12 below were reconstructed from commit history after the original
plan document was lost (it lived only on a local disk and was never
committed — hence this file now being in the repo). M13+ is the forward
plan.

## Architecture

```
client/   React + TS (Vite, Tailwind, Monaco, React Query)
server/   Express + TS API  ─┬─ Postgres via Prisma
          judging worker    ─┴─ Redis via BullMQ ── Docker sandbox
shared/   Zod schemas + types imported by both sides
```

The API never executes untrusted code. It enqueues a job; a separate
worker process pulls from the queue and runs the code inside a locked-down
container. That split is deliberate — a judging crash or a fork bomb
can't take the web server down with it.

## Completed milestones

### M1 — Monorepo scaffold
npm workspaces (`client`/`server`/`shared`), TypeScript throughout, ESLint
+ Prettier, GitHub Actions CI.

### M2 — Postgres + Prisma, User model
docker-compose Postgres on host port **5433** (5432 was taken by a native
Postgres service on the original dev machine). Prisma 7 with the
driver-adapter pattern (`@prisma/adapter-pg`).

### M3 — Authentication
Register/login/logout/me. bcrypt password hashing, JWT in an **httpOnly**
cookie (invisible to `document.cookie`, so XSS can't exfiltrate a
session). Zod validation, rate limiting, and a central error handler that
never leaks raw errors to the client.

### M4 — Problems
Public paginated list (filter by difficulty/tag, search) and detail by
slug (published only). Admin CRUD behind `requireAuth` +
`requireRole('ADMIN')`, enforced server-side — verified with direct API
calls, not just hidden UI.

### M5 — Test cases + Monaco editor
`TestCase` model where `isHidden:false` rows *are* the public samples —
one model, no separate table. Nested admin CRUD under
`/admin/problems/:id/testcases`. Monaco editor with per-language starter
stubs.

### M6 — Output comparison
`judge/compare.ts`: CRLF normalization, tolerant of trailing whitespace
per line and trailing blank lines, otherwise exact. Pure and
side-effect-free, so it's unit-testable without Docker. 10 tests.

### M7 — Docker sandbox (Python)
The security core. Per run: memory+swap capped **together** (capping
memory alone lets a process swap instead of hitting the limit), 1 CPU,
64 PIDs (fork-bomb defense), no network, read-only root filesystem with a
writable `/workspace` tmpfs, non-root user, **all** capabilities dropped,
`no-new-privileges`.

Two constraints discovered here shape `docker.ts` and are worth knowing
before editing it:
1. Docker refuses `putArchive`/`cp` into *any* container with
   `ReadonlyRootfs`, even targeting a writable tmpfs. Files go in via
   `exec` + base64 decode instead.
2. Reading a fast-exiting process's output live off the attach stream
   raced the stream's own end/close events and intermittently lost the
   last chunk. Output is redirected to files inside the container and
   read back after exit.

### M8 — Real queue + worker
Redis + BullMQ. `POST /run` enqueues and returns a job id; `GET
/run/:jobId` is scoped so another user's job 404s exactly like a
nonexistent one. Judging moved out of the request handler into
`src/worker`. `judgeLimiter` keyed by **user id**, not IP, so it can't be
dodged by switching networks.

### M9 — C, C++, Java
One `gcc` image serves both C and C++. Java's public class name is
detected by regex and the source file named to match. Compile runs in the
same container as the eventual run, with its own generous budget
(512MB/15s), then memory is tightened via `container.update()` before
untrusted code executes — so a strict problem limit never causes a false
compile failure.

### M10 — Submit + submission history
`TestCaseResult` deliberately has **no** input/output columns, so hidden
test content structurally cannot leak through it no matter who queries.
Overall verdict picked by priority (compile error > TLE > MLE > RE > WA >
AC) rather than "last test run". `GET /submissions/:id` is owner-or-admin
only.

### M11 — Profile, dark mode, tag filtering
Public profile (no email exposed): solved count, acceptance rate, 365-day
heatmap. Class-based dark mode with a pre-hydration script so there's no
flash of the wrong theme.

### M12 — Email verification + password reset
Tokens are SHA-256 hashed at rest (not bcrypt — they're already
high-entropy and not user-chosen). Forgot-password always returns 204
whether or not the email exists, so it can't be used to enumerate
accounts. Reset tokens are single-use. Ethereal test account auto-created
when no SMTP env vars are set.

## Forward plan

### M13 — Test coverage
The gap: 10 unit tests covering one pure function, and nothing else.
Every security boundary (who may read a submission, who may see an
unpublished problem, whether hidden test data leaks) was verified by hand
once and is currently unprotected against regression.

- Integration test harness against a real throwaway Postgres schema
- Auth: registration, login, session, rate limiting, token single-use
- Authorization: the owner-or-admin and published-only boundaries
- Leak protection: assert hidden test case content never appears in any
  public or submission response
- Judge: verdict selection and compare edge cases

### M14 — Contests
`Problem.contestId` and `Submission.contestId` already exist in the
schema, reserved since M4/M10 for exactly this.

- `Contest` model: window (start/end), visibility, problem set
- Registration, and enforcement that submissions only count inside the
  window
- Scoring + live leaderboard (solve count, then penalty time)
- Admin contest CRUD; frontend list/detail/leaderboard pages

### M15 — Production deployment
- Multi-stage production Dockerfiles for api, worker, and client
- Production compose/orchestration config, non-dev secrets handling
- Real SMTP (currently a straight env-var swap away)
- Security review pass: cookie `sameSite` for the chosen deploy topology,
  CSP, secret rotation
- Deployment + operations documentation
