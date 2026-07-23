import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { redisConnection } from "../queue/connection.js";
import { RUN_QUEUE_NAME } from "../queue/queues.js";
import { processRunJob } from "./processors/run.processor.js";

const runWorker = new Worker(RUN_QUEUE_NAME, processRunJob, {
  connection: redisConnection,
  concurrency: env.WORKER_CONCURRENCY,
});

runWorker.on("ready", () => {
  logger.info(`Worker listening on queue "${RUN_QUEUE_NAME}" (concurrency ${env.WORKER_CONCURRENCY})`);
});

runWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Job failed");
});

async function shutdown() {
  logger.info("Worker shutting down...");
  await runWorker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
