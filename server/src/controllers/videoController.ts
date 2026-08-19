import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { AppError } from "../middleware/errorHandler";
import { listVideoFiles, getVideoStream } from "../lib/storage";

const prisma = new PrismaClient();

/**
 * Scan the R2 bucket for video files and upsert records into the database.
 * Admin uploads videos to the R2 bucket's `videos/` prefix via the
 * Cloudflare dashboard, then hits this endpoint to register them.
 */
export const scanVideos = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const videoFiles = await listVideoFiles();

    const results = [];
    for (const filename of videoFiles) {
      const title = path
        .basename(filename, path.extname(filename))
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const video = await prisma.video.upsert({
        where: { filename },
        update: {},
        create: {
          title,
          filename,
          path: `videos/${filename}`,
        },
      });
      results.push(video);
    }

    // Remove DB entries for files that no longer exist in R2
    const allVideos = await prisma.video.findMany();
    const fileSet = new Set(videoFiles);
    for (const v of allVideos) {
      if (!fileSet.has(v.filename)) {
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
 * Stream a video from R2 with HTTP Range support for seeking.
 * The server proxies the stream from R2 to the client so that
 * range requests work seamlessly with the HTML5 video element.
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

    const range = req.headers.range;
    const { stream, contentType, contentLength, totalSize, start, end } =
      await getVideoStream(video.filename, range || undefined);

    if (range && start !== undefined && end !== undefined) {
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": contentType,
      });
    } else {
      res.writeHead(200, {
        "Content-Length": totalSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      });
    }

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};
