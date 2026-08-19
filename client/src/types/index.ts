// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------
export interface Video {
  id: string;
  title: string;
  filename: string;
  path: string;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    feedbacks: number;
  };
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------
export type FeedbackType = "TEXT" | "AUDIO";

export interface Feedback {
  id: string;
  videoId: string;
  userName: string;
  type: FeedbackType;
  content: string;
  timestampSec: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------
export interface ShareLinkResponse {
  token: string;
  shareUrl: string;
  expiresAt: string | null;
}

export interface SharedData {
  video: Video;
  userName: string;
  feedbacks: Feedback[];
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export type ExportFormat = "json" | "csv";

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export interface FeedbackUserStat {
  userName: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------
export interface ScanResult {
  scanned: number;
  videos: Video[];
}
