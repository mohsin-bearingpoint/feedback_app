import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../middleware/errorHandler";
import {
  createTextFeedbackSchema,
  createAudioFeedbackSchema,
  updateFeedbackSchema,
  feedbackQuerySchema,
} from "../middleware/validation";
import { uploadAudio, deleteAudio } from "../lib/storage";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Multer config – use memory storage (buffer) so we can upload to R2
// ---------------------------------------------------------------------------
export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/ogg",
      "audio/wav",
      "audio/x-m4a",
      "video/webm", // some browsers report webm audio as video/webm
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Unsupported audio format: ${file.mimetype}`));
    }
  },
});

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/** Get feedback for a video. Regular users can only see their own. Admins see all. */
export const getFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = feedbackQuerySchema.parse(req.query);

    const where: Record<string, unknown> = { videoId: query.videoId };

    // Non-admin users are locked to their own userName
    if (!req.isAdmin) {
      where.userName = req.sessionUser!.userName;
    } else if (query.userName) {
      where.userName = query.userName;
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { timestampSec: "asc" },
    });

    res.json(feedbacks);
  } catch (error) {
    next(error);
  }
};

/** Create text feedback at a given timestamp. */
export const createTextFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createTextFeedbackSchema.parse(req.body);

    if (req.sessionUser && data.userName !== req.sessionUser.userName) {
      throw new AppError(403, "Cannot create feedback for another user");
    }

    const video = await prisma.video.findUnique({
      where: { id: data.videoId },
    });
    if (!video) {
      throw new AppError(404, "Video not found");
    }

    const feedback = await prisma.feedback.create({
      data: {
        videoId: data.videoId,
        userName: req.sessionUser!.userName,
        type: "TEXT",
        content: data.content,
        timestampSec: data.timestampSec,
      },
    });

    res.status(201).json(feedback);
  } catch (error) {
    next(error);
  }
};

/** Create audio feedback – receives multipart form, uploads buffer to R2. */
export const createAudioFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createAudioFeedbackSchema.parse(req.body);

    if (req.sessionUser && data.userName !== req.sessionUser.userName) {
      throw new AppError(403, "Cannot create feedback for another user");
    }

    if (!req.file) {
      throw new AppError(400, "Audio file is required");
    }

    const video = await prisma.video.findUnique({
      where: { id: data.videoId },
    });
    if (!video) {
      throw new AppError(404, "Video not found");
    }

    // Upload to R2
    const ext = path.extname(req.file.originalname) || ".webm";
    const filename = `audio-${uuidv4()}${ext}`;
    const storageKey = await uploadAudio(
      req.file.buffer,
      filename,
      req.file.mimetype
    );

    const feedback = await prisma.feedback.create({
      data: {
        videoId: data.videoId,
        userName: req.sessionUser!.userName,
        type: "AUDIO",
        content: storageKey, // e.g. "audio/audio-uuid.webm"
        timestampSec: data.timestampSec,
      },
    });

    res.status(201).json(feedback);
  } catch (error) {
    next(error);
  }
};

/** Update text feedback content. Only the owner can update. */
export const updateFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { content } = updateFeedbackSchema.parse(req.body);

    const existing = await prisma.feedback.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      throw new AppError(404, "Feedback not found");
    }

    if (req.sessionUser && existing.userName !== req.sessionUser.userName) {
      throw new AppError(403, "You can only edit your own feedback");
    }

    if (existing.type !== "TEXT") {
      throw new AppError(400, "Only text feedback can be edited");
    }

    const feedback = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { content },
    });

    res.json(feedback);
  } catch (error) {
    next(error);
  }
};

/** Delete feedback (and its R2 audio file if applicable). Only the owner can delete. */
export const deleteFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await prisma.feedback.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      throw new AppError(404, "Feedback not found");
    }

    if (req.sessionUser && existing.userName !== req.sessionUser.userName) {
      throw new AppError(403, "You can only delete your own feedback");
    }

    // Delete audio from R2 if it's audio feedback
    if (existing.type === "AUDIO" && existing.content) {
      try {
        await deleteAudio(existing.content);
      } catch {
        // Non-fatal – file may already be gone
      }
    }

    await prisma.feedback.delete({ where: { id: req.params.id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/** Get feedback stats grouped by user for a video (admin view). */
export const getFeedbackStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const videoId = req.params.videoId;

    const stats = await prisma.feedback.groupBy({
      by: ["userName"],
      where: { videoId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const result = stats.map((s) => ({
      userName: s.userName,
      count: s._count.id,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
};
