import { Router } from "express";
import {
  getFeedback,
  getFeedbackStats,
  createTextFeedback,
  createAudioFeedback,
  updateFeedback,
  deleteFeedback,
  audioUpload,
} from "../controllers/feedbackController";
import { userAuth, adminAuth } from "../middleware/auth";

export const feedbackRouter = Router();

// User routes – require valid session token
feedbackRouter.get("/", userAuth, getFeedback);
feedbackRouter.post("/", userAuth, createTextFeedback);
feedbackRouter.post("/audio", userAuth, audioUpload.single("audio"), createAudioFeedback);
feedbackRouter.put("/:id", userAuth, updateFeedback);
feedbackRouter.delete("/:id", userAuth, deleteFeedback);

// Admin-only routes
feedbackRouter.get("/stats/:videoId", adminAuth, getFeedbackStats);
feedbackRouter.get("/admin/all", adminAuth, getFeedback);
