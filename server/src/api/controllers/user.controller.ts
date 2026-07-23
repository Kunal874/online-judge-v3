import type { Request, Response } from "express";
import * as userService from "../services/user.service.js";

export async function getProfile(req: Request, res: Response) {
  const profile = await userService.getUserProfile(req.params.handle!);
  res.json({ profile });
}
