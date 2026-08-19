import { z } from "zod";

// ---------------------------------------------------------------------------
// Feedback schemas
// ---------------------------------------------------------------------------
export const createTextFeedbackSchema = z.object({
  videoId: z.string().uuid("Invalid video ID"),
  userName: z.string().min(1, "Name is required").max(100),
  type: z.literal("TEXT"),
  content: z.string().min(1, "Feedback content is required").max(5000),
  timestampSec: z.number().min(0, "Timestamp must be non-negative"),
});

export const createAudioFeedbackSchema = z.object({
  videoId: z.string().uuid("Invalid video ID"),
  userName: z.string().min(1, "Name is required").max(100),
  timestampSec: z.coerce.number().min(0, "Timestamp must be non-negative"),
});

export const updateFeedbackSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
});

// ---------------------------------------------------------------------------
// Share schemas
// ---------------------------------------------------------------------------
export const createShareLinkSchema = z.object({
  videoId: z.string().uuid("Invalid video ID"),
  userName: z.string().min(1, "Name is required").max(100),
  expiresInHours: z.number().min(1).max(720).optional(), // max 30 days
});

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------
export const feedbackQuerySchema = z.object({
  videoId: z.string().uuid("Invalid video ID"),
  userName: z.string().min(1).optional(),
});

export const exportQuerySchema = z.object({
  videoId: z.string().uuid("Invalid video ID"),
  format: z.enum(["json", "csv"]),
  userName: z.string().min(1).optional(),
});
