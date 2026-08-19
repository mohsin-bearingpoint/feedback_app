/**
 * Storage abstraction for Cloudflare R2 (S3-compatible).
 *
 * Bucket layout:
 *   videos/<filename>     – video files uploaded by admin via Cloudflare dashboard
 *   audio/<filename>      – audio feedback recordings uploaded by the app
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "feedback-app";
const VIDEO_PREFIX = "videos/";
const AUDIO_PREFIX = "audio/";

// ---------------------------------------------------------------------------
// Video helpers
// ---------------------------------------------------------------------------

/** List all video files in the bucket. Returns filenames (without prefix). */
export async function listVideoFiles(): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: VIDEO_PREFIX,
  });

  const result = await s3.send(command);
  if (!result.Contents) return [];

  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov"];

  return result.Contents
    .map((obj) => obj.Key || "")
    .filter((key) => {
      const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
      return videoExtensions.includes(ext);
    })
    .map((key) => key.replace(VIDEO_PREFIX, ""));
}

/**
 * Get a video object stream from R2 with optional byte-range support.
 * Returns the stream, content info, and total size.
 */
export async function getVideoStream(
  filename: string,
  range?: string
): Promise<{
  stream: Readable;
  contentType: string;
  contentLength: number;
  totalSize: number;
  start?: number;
  end?: number;
}> {
  const key = `${VIDEO_PREFIX}${filename}`;

  // First, get the object metadata to know total size
  const headCommand = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  // We'll fetch with range if provided
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Range: range || undefined,
  });

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".mov": "video/quicktime",
  };
  const contentType = mimeTypes[ext] || "video/mp4";

  const response = await s3.send(getCommand);
  const stream = response.Body as Readable;
  const contentLength = response.ContentLength || 0;

  // ContentRange header: "bytes 0-999/5000"
  let totalSize = contentLength;
  let start: number | undefined;
  let end: number | undefined;

  if (response.ContentRange) {
    const match = response.ContentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
    if (match) {
      start = parseInt(match[1], 10);
      end = parseInt(match[2], 10);
      totalSize = parseInt(match[3], 10);
    }
  }

  return { stream, contentType, contentLength, totalSize, start, end };
}

// ---------------------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------------------

/** Upload an audio recording to R2. Returns the storage key. */
export async function uploadAudio(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `${AUDIO_PREFIX}${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return key;
}

/** Generate a presigned URL for audio playback (expires in 1 hour). */
export async function getAudioSignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

/** Delete an audio file from R2. */
export async function deleteAudio(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  );
}
