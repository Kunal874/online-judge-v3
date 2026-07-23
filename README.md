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

Setup instructions are added as each piece comes online — see the project plan for the full milestone sequence.
