import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../middleware/errorHandler";
import {
  createTextFeedbackSchema,
  createAudioFeedbackSchema,
  updateFeedbackSchema,
  feedbackQuerySchema,
} from "../middleware/validation";

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Multer config for audio uploads
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `audio-${uuidv4()}${ext}`);
  },
});

export const audioUpload = multer({
  storage,
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
      // Admin can optionally filter by userName
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

    // Enforce: you can only create feedback under your own name
    if (req.sessionUser && data.userName !== req.sessionUser.userName) {
      throw new AppError(403, "Cannot create feedback for another user");
    }

    // Verify video exists
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

/** Create audio feedback – receives multipart form with audio file. */
export const createAudioFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createAudioFeedbackSchema.parse(req.body);

    // Enforce ownership
    if (req.sessionUser && data.userName !== req.sessionUser.userName) {
      if (req.file) fs.unlinkSync(req.file.path);
      throw new AppError(403, "Cannot create feedback for another user");
    }

    if (!req.file) {
      throw new AppError(400, "Audio file is required");
    }

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: data.videoId },
    });
    if (!video) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      throw new AppError(404, "Video not found");
    }

    // Store relative path as content so the client can construct a URL
    const relativePath = `/uploads/${req.file.filename}`;

    const feedback = await prisma.feedback.create({
      data: {
        videoId: data.videoId,
        userName: req.sessionUser!.userName,
        type: "AUDIO",
        content: relativePath,
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

    // Enforce ownership
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

/** Delete feedback (and its audio file if applicable). Only the owner can delete. */
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

    // Enforce ownership
    if (req.sessionUser && existing.userName !== req.sessionUser.userName) {
      throw new AppError(403, "You can only delete your own feedback");
    }

    // Delete audio file from disk if it's audio feedback
    if (existing.type === "AUDIO" && existing.content) {
      const filePath = path.join(__dirname, "..", "..", existing.content);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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
