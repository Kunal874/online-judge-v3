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

// Just the id — unlike a run job, a submission is already persisted in
// Postgres (code, language, problemId) the moment it's created, so the
// worker reads the authoritative row instead of carrying a second copy of
// the code through Redis.
export interface SubmitJobData {
  submissionId: string;
}

export const SUBMIT_QUEUE_NAME = "submit";

export const submitQueue = new Queue<SubmitJobData, void>(SUBMIT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  },
});
