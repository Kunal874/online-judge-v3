import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

// Parses+replaces req.body with the validated (and coerced/trimmed) data,
// so controllers can trust req.body matches the schema's inferred type.
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
