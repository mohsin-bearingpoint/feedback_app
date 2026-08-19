import { Router } from "express";
import { exportFeedback } from "../controllers/exportController";
import { userOrAdminAuth } from "../middleware/auth";

export const exportRouter = Router();

// Export requires either a user session (exports own feedback)
// or admin key (exports all feedback)
exportRouter.get("/", userOrAdminAuth, exportFeedback);
