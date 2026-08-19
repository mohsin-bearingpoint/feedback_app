import express from "express";
import cors from "cors";
import helmet from "helmet";
import { PrismaClient } from "@prisma/client";
import { videoRouter } from "./routes/videos";
import { feedbackRouter } from "./routes/feedback";
import { shareRouter } from "./routes/share";
import { exportRouter } from "./routes/export";
import { authRouter } from "./routes/auth";
import { errorHandler, AppError } from "./middleware/errorHandler";
import { userOrAdminAuth } from "./middleware/auth";
import { getAudioSignedUrl } from "./lib/storage";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

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
    origin: (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/+$/, ""),
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
// Authenticated audio endpoint
// Validates auth, then redirects to a presigned R2 URL.
// Audio files are stored in R2 under "audio/<filename>".
// ---------------------------------------------------------------------------
app.get(
  "/audio/:key(*)",
  userOrAdminAuth,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const storageKey = req.params.key; // e.g. "audio/audio-uuid.webm"

      // If the user is not admin and not on a share link, verify ownership
      if (!req.isAdmin && req.sessionUser?.sessionId !== "share") {
        const feedback = await prisma.feedback.findFirst({
          where: {
            content: storageKey,
            userName: req.sessionUser!.userName,
          },
        });
        if (!feedback) {
          throw new AppError(403, "Access denied to this audio file");
        }
      }

      const signedUrl = await getAudioSignedUrl(storageKey);
      res.redirect(signedUrl);
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
  console.log(`Storage: Cloudflare R2 (bucket: ${process.env.R2_BUCKET_NAME})`);
});

export default app;
