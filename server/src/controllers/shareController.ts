import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../middleware/errorHandler";
import { createShareLinkSchema } from "../middleware/validation";

const prisma = new PrismaClient();

/** Create a shareable link for a video + user's feedback. */
export const createShareLink = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createShareLinkSchema.parse(req.body);

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: data.videoId },
    });
    if (!video) {
      throw new AppError(404, "Video not found");
    }

    // Check if a share link already exists for this video+user
    const existing = await prisma.shareLink.findFirst({
      where: {
        videoId: data.videoId,
        userName: data.userName,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (existing) {
      res.json({
        token: existing.token,
        shareUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/share/${existing.token}`,
        expiresAt: existing.expiresAt,
      });
      return;
    }

    // Create new share link
    const expiresAt = data.expiresInHours
      ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
      : null;

    const shareLink = await prisma.shareLink.create({
      data: {
        videoId: data.videoId,
        userName: data.userName,
        token: uuidv4(),
        expiresAt,
      },
    });

    res.status(201).json({
      token: shareLink.token,
      shareUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/share/${shareLink.token}`,
      expiresAt: shareLink.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

/** Resolve a share token and return the video + feedback data. */
export const getSharedData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: { video: true },
    });

    if (!shareLink) {
      throw new AppError(404, "Share link not found");
    }

    // Check expiry
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new AppError(410, "Share link has expired");
    }

    // Get feedback for this video + user
    const feedbacks = await prisma.feedback.findMany({
      where: {
        videoId: shareLink.videoId,
        userName: shareLink.userName,
      },
      orderBy: { timestampSec: "asc" },
    });

    res.json({
      video: shareLink.video,
      userName: shareLink.userName,
      feedbacks,
    });
  } catch (error) {
    next(error);
  }
};
