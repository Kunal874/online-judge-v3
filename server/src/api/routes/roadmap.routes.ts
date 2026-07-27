import { Router } from "express";
import * as roadmapController from "../controllers/roadmap.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { optionalAuth } from "../middleware/auth.js";

export const roadmapRouter = Router();

// optionalAuth, not requireAuth: the graph is worth seeing signed out — it
// is the catalogue's shape. Signing in only fills the nodes in.
roadmapRouter.get("/", optionalAuth, asyncHandler(roadmapController.getRoadmap));
roadmapRouter.get("/route/:slug", optionalAuth, asyncHandler(roadmapController.getRoute));
