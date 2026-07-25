import { afterAll, beforeEach, vi } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { resetRateLimiters } from "../../src/api/middleware/rateLimiter.js";

// The HTTP layer transitively imports the queue module, and constructing a
// BullMQ Queue opens a real Redis connection on import — which would make
// every API test require Redis, and leave a handle open that stops vitest
// exiting. Enqueuing is asserted via these spies instead; what the worker
// then does with a job is the worker's own concern, tested separately.
vi.mock("../../src/queue/queues.js", () => ({
  RUN_QUEUE_NAME: "run",
  SUBMIT_QUEUE_NAME: "submit",
  runQueue: { add: vi.fn(async () => ({ id: "test-run-job" })), getJob: vi.fn(async () => null) },
  submitQueue: { add: vi.fn(async () => ({ id: "test-submit-job" })) },
}));

// Registration sends a verification email fire-and-forget. Unmocked, that
// reaches out to Ethereal over the network on the first test that registers.
vi.mock("../../src/email/mailer.js", () => ({
  sendMail: vi.fn(async () => undefined),
}));

// Discovered rather than hard-coded so adding a model doesn't silently
// start leaking rows between tests.
async function truncateAll() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma%'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

beforeEach(async () => {
  await truncateAll();
  resetRateLimiters();
});

afterAll(async () => {
  await prisma.$disconnect();
});
