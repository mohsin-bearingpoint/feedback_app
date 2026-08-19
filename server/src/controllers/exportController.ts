import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { exportQuerySchema } from "../middleware/validation";

const prisma = new PrismaClient();

/** Format seconds to MM:SS display. */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Escape a value for CSV (handles commas, quotes, newlines). */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export feedback as JSON or CSV. */
export const exportFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = exportQuerySchema.parse(req.query);

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: query.videoId },
    });
    if (!video) {
      throw new AppError(404, "Video not found");
    }

    const where: Record<string, unknown> = { videoId: query.videoId };

    // Non-admin users can only export their own feedback
    if (!req.isAdmin) {
      where.userName = req.sessionUser!.userName;
    } else if (query.userName) {
      where.userName = query.userName;
    }

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { timestampSec: "asc" },
    });

    if (query.format === "csv") {
      const header = "Video,Timestamp,Time (seconds),Type,User,Content,Created At";
      const rows = feedbacks.map((f) =>
        [
          csvEscape(video.title),
          formatTimestamp(f.timestampSec),
          f.timestampSec.toFixed(1),
          f.type,
          csvEscape(f.userName),
          csvEscape(f.type === "AUDIO" ? `[Audio recording]` : f.content),
          f.createdAt.toISOString(),
        ].join(",")
      );

      const csv = [header, ...rows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="feedback-${video.title.replace(/\s+/g, "_")}.csv"`
      );
      res.send(csv);
    } else {
      // JSON format
      const exportData = {
        video: {
          id: video.id,
          title: video.title,
          filename: video.filename,
          duration: video.duration,
        },
        exportedAt: new Date().toISOString(),
        totalFeedbacks: feedbacks.length,
        feedbacks: feedbacks.map((f) => ({
          id: f.id,
          timestamp: formatTimestamp(f.timestampSec),
          timestampSec: f.timestampSec,
          type: f.type,
          userName: f.userName,
          content: f.content,
          createdAt: f.createdAt.toISOString(),
        })),
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="feedback-${video.title.replace(/\s+/g, "_")}.json"`
      );
      res.json(exportData);
    }
  } catch (error) {
    next(error);
  }
};
