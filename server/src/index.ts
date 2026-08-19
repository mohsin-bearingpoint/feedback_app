import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { videoRouter } from "./routes/videos";
import { feedbackRouter } from "./routes/feedback";
import { shareRouter } from "./routes/share";
import { exportRouter } from "./routes/export";
import { authRouter } from "./routes/auth";
import { errorHandler, AppError } from "./middleware/errorHandler";
import { userOrAdminAuth } from "./middleware/auth";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-admin-key",
    ],
  })
);
app.use(express.json());

// ---------------------------------------------------------------------------
// NO static serving of /uploads – audio files are served through the
// authenticated endpoint below instead.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Authenticated audio file endpoint
// Requires either a valid user session, admin key, or share token.
// ---------------------------------------------------------------------------
app.get(
  "/uploads/:filename",
  userOrAdminAuth,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { filename } = req.params;

      // Sanitise filename to prevent directory traversal
      const sanitised = path.basename(filename);
      const filePath = path.join(UPLOADS_DIR, sanitised);

      if (!fs.existsSync(filePath)) {
        throw new AppError(404, "Audio file not found");
      }

      // If the user is not admin, verify they own the feedback that references this file
      if (!req.isAdmin && req.sessionUser?.sessionId !== "share") {
        const feedback = await prisma.feedback.findFirst({
          where: {
            content: `/uploads/${sanitised}`,
            userName: req.sessionUser!.userName,
          },
        });
        if (!feedback) {
          throw new AppError(403, "Access denied to this audio file");
        }
      }

      const ext = path.extname(sanitised).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".webm": "audio/webm",
        ".mp4": "audio/mp4",
        ".ogg": "audio/ogg",
        ".wav": "audio/wav",
        ".m4a": "audio/x-m4a",
      };

      res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/videos", videoRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/share", shareRouter);
app.use("/api/export", exportRouter);

// Health check (public)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Videos directory: ${path.join(__dirname, "..", "videos")}`);
  console.log(`Audio uploads (authenticated): ${UPLOADS_DIR}`);
});

export default app;
