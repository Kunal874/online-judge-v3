import type { Request, Response } from "express";
import * as userService from "../services/user.service.js";
import { UnauthorizedError } from "../../lib/errors.js";

export async function getProfile(req: Request, res: Response) {
  const profile = await userService.getUserProfile(req.params.handle!);
  res.json({ profile });
}

// Always the caller's own diagnostics — there is no handle parameter, so
// there is no version of this route that reads somebody else's. The
// profile is the public artefact; this is the private one.
export async function getMyAnalytics(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  const analytics = await userService.getAnalytics(req.user.id);
  res.json({ analytics });
}
