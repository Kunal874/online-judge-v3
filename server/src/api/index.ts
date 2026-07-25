import { createApp } from "./app.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../db/prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

// Containers are stopped with SIGTERM, and without this the process is
// killed mid-request — a client sees a dropped connection rather than the
// response it was about to get. Matches the worker's existing behavior.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  // Don't wait forever on a hung keep-alive connection.
  setTimeout(() => {
    logger.warn("Forcing shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
