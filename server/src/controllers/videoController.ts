import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { AppError } from "../middleware/errorHandler";

const prisma = new PrismaClient();
const VIDEOS_DIR = path.join(__dirname, "..", "..", "videos");

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov"];
const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
};

/**
 * Scan the videos directory and upsert records into the database.
 * Admin drops files into server/videos/ and hits this endpoint.
 */
export const scanVideos = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = fs.readdirSync(VIDEOS_DIR);
    const videoFiles = files.filter((f) =>
      VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase())
    );

    const results = [];
    for (const filename of videoFiles) {
      const title = path
        .basename(filename, path.extname(filename))
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const video = await prisma.video.upsert({
        where: { filename },
        update: { path: path.join(VIDEOS_DIR, filename) },
        create: {
          title,
          filename,
          path: path.join(VIDEOS_DIR, filename),
        },
      });
      results.push(video);
    }

    // Remove DB entries for files that no longer exist on disk
    const allVideos = await prisma.video.findMany();
    for (const v of allVideos) {
      if (!fs.existsSync(v.path)) {
        await prisma.video.delete({ where: { id: v.id } });
      }
    }

    res.json({ scanned: results.length, videos: results });
  } catch (error) {
    next(error);
  }
};

/** List all registered videos with user-scoped feedback counts. */
export const listVideos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: "desc" },
    });

    // If a user is authenticated, show only THEIR feedback count.
    // Otherwise (no token) show 0 – the total is admin-only info.
    const userName = req.sessionUser?.userName;

    if (userName) {
      const counts = await prisma.feedback.groupBy({
        by: ["videoId"],
        where: { userName },
        _count: { id: true },
      });
      const countMap = new Map(counts.map((c) => [c.videoId, c._count.id]));

      res.json(
        videos.map((v) => ({
          ...v,
          _count: { feedbacks: countMap.get(v.id) || 0 },
        }))
      );
    } else {
      res.json(
        videos.map((v) => ({
          ...v,
          _count: { feedbacks: 0 },
        }))
      );
    }
  } catch (error) {
    next(error);
  }
};

/** Get a single video by ID. */
export const getVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
    });
    if (!video) {
      throw new AppError(404, "Video not found");
    }
    res.json(video);
  } catch (error) {
    next(error);
  }
};

/** Update video duration (called from client after metadata loads). */
export const updateVideoDuration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { duration } = req.body;
    if (typeof duration !== "number" || duration <= 0) {
      throw new AppError(400, "Invalid duration");
    }
    const video = await prisma.video.update({
      where: { id: req.params.id },
      data: { duration },
    });
    res.json(video);
  } catch (error) {
    next(error);
  }
};

/**
 * Stream a video file with HTTP Range support for seeking.
 * This is critical for a good video playback experience.
 */
export const streamVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
    });
    if (!video) {
      throw new AppError(404, "Video not found");
    }

    if (!fs.existsSync(video.path)) {
      throw new AppError(404, "Video file not found on disk");
    }

    const stat = fs.statSync(video.path);
    const fileSize = stat.size;
    const ext = path.extname(video.path).toLowerCase();
    const contentType = MIME_TYPES[ext] || "video/mp4";
    const range = req.headers.range;

    if (range) {
      // Partial content (range request for seeking)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(video.path, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
      });
      stream.pipe(res);
    } else {
      // Full file
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(video.path).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};
