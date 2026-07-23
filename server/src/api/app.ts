import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { authRouter } from "./routes/auth.routes.js";
import { problemRouter } from "./routes/problem.routes.js";
import { adminProblemRouter } from "./routes/admin/problem.routes.js";
import { runRouter } from "./routes/run.routes.js";
import { submissionRouter } from "./routes/submission.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  // Generous enough for a max-size code + stdin submission (100k chars
  // each) plus JSON escaping overhead.
  app.use(express.json({ limit: "512kb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/problems", problemRouter);
  app.use("/admin/problems", adminProblemRouter);
  app.use("/run", runRouter);
  app.use("/submissions", submissionRouter);

  // Must be last: catches errors from every route above.
  app.use(errorHandler);

  return app;
}
