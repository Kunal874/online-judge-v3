import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../lib/errors.js";

// Must be registered last. Never forwards raw error objects/stack traces to
// the client — those are logged server-side only.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: err.flatten().fieldErrors });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, "Request failed");
    }
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
