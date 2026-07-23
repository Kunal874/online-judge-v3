import IORedis from "ioredis";
import { env } from "../config/env.js";

// BullMQ requires this exact setting on any connection it's given.
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
