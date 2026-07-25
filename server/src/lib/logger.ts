import pino from "pino";
import { env } from "../config/env.js";

// Silent under test: pino-http logs a full request/response pair per call,
// which buries assertion failures in hundreds of lines of noise. Errors
// surface through the assertions themselves.
export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "production" || env.NODE_ENV === "test"
      ? undefined
      : { target: "pino-pretty" },
});
