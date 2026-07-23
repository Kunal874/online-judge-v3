import { Queue } from "bullmq";
import type { RunRequest, RunResult } from "@online-judge/shared";
import { redisConnection } from "./connection.js";

export interface RunJobData extends RunRequest {
  userId: string;
}

export const RUN_QUEUE_NAME = "run";

export const runQueue = new Queue<RunJobData, RunResult>(RUN_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // Ad-hoc run jobs aren't persisted anywhere else — keep a bounded
    // recent history for polling/debugging, not forever.
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  },
});
