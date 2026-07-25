# Online Judge

A full-stack online judge (write code in-browser, run it against test cases, get a verdict).

## Structure

- `client/` — React + TypeScript frontend (Vite, Tailwind, Monaco, React Query)
- `server/` — Express + TypeScript API and judging worker (Prisma/Postgres, BullMQ/Redis)
- `shared/` — Zod schemas and TypeScript types shared by both

## Local development

Prerequisites: Node.js 22+, Docker Desktop, Git.

```bash
npm install
```

Copy `server/.env.example` to `server/.env` and fill in real values (see comments in the file).

Start Postgres:

```bash
docker compose up -d postgres
```

Apply migrations and (optionally) seed sample problems:

```bash
npm run prisma:migrate -w server
npm run seed -w server
```

Build the judge's sandbox image(s) — required before Run/Submit will work:

```bash
npm run docker:build -w server
```

Run the app:

```bash
npm run dev:api -w server    # or: npm run dev:api
npm run dev:client -w client # or: npm run dev:client
```

Run the judging worker (needed for Run/Submit to produce verdicts):

```bash
npm run dev:worker -w server
```

Optionally create an admin account (skipped unless the variable is set —
there is deliberately no default password):

```bash
SEED_ADMIN_PASSWORD=your-local-password npm run seed -w server
```

## Testing

```bash
npm test
```

Integration tests run against a real Postgres. They create and migrate
their own `online_judge_test` database, so the dev database is untouched —
just make sure `docker compose up -d postgres` is running.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md). Read the note about the worker and the
Docker socket before putting this on a shared host.

## Design notes

See [PLAN.md](PLAN.md) for the milestone sequence and the reasoning behind
the sandbox's constraints.
