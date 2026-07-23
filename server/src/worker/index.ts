import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { redisConnection } from "../queue/connection.js";
import { RUN_QUEUE_NAME, SUBMIT_QUEUE_NAME } from "../queue/queues.js";
import { processRunJob } from "./processors/run.processor.js";
import { processSubmitJob } from "./processors/submit.processor.js";

const runWorker = new Worker(RUN_QUEUE_NAME, processRunJob, {
  connection: redisConnection,
  concurrency: env.WORKER_CONCURRENCY,
});

const submitWorker = new Worker(SUBMIT_QUEUE_NAME, processSubmitJob, {
  connection: redisConnection,
  concurrency: env.WORKER_CONCURRENCY,
});

for (const [name, worker] of [
  [RUN_QUEUE_NAME, runWorker],
  [SUBMIT_QUEUE_NAME, submitWorker],
] as const) {
  worker.on("ready", () => {
    logger.info(`Worker listening on queue "${name}" (concurrency ${env.WORKER_CONCURRENCY})`);
  });
  worker.on("failed", (job, err) => {
    logger.error({ queue: name, jobId: job?.id, err }, "Job failed");
  });
}

async function shutdown() {
  logger.info("Worker shutting down...");
  await Promise.all([runWorker.close(), submitWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
