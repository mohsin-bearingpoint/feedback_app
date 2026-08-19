import { Router } from "express";
import {
  listVideos,
  getVideo,
  scanVideos,
  streamVideo,
  updateVideoDuration,
} from "../controllers/videoController";
import { optionalUserAuth } from "../middleware/auth";

export const videoRouter = Router();

// optionalUserAuth: if a valid token is present, attach userName
// so the list endpoint can return user-scoped feedback counts.
videoRouter.get("/", optionalUserAuth, listVideos);
videoRouter.post("/scan", scanVideos);
videoRouter.get("/:id", getVideo);
videoRouter.get("/:id/stream", streamVideo);
videoRouter.patch("/:id/duration", updateVideoDuration);
