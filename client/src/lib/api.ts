import type {
  Video,
  Feedback,
  FeedbackUserStat,
  ShareLinkResponse,
  SharedData,
  ScanResult,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// ---------------------------------------------------------------------------
// Token management helpers (read from localStorage / sessionStorage)
// ---------------------------------------------------------------------------
function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("feedback_app_token");
}

function getAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("feedback_app_admin_key");
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getUserToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const adminKey = getAdminKey();
  if (adminKey) headers["x-admin-key"] = adminKey;
  return headers;
}

// ---------------------------------------------------------------------------
// Generic request helper
// ---------------------------------------------------------------------------
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const mergedHeaders: Record<string, string> = {
    ...authHeaders(),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, { ...options, headers: mergedHeaders });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const createSession = (
  userName: string
): Promise<{ token: string; userName: string }> =>
  request(`${API_URL}/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName }),
  });

export const verifyAdminPassword = (
  password: string
): Promise<{ authenticated: boolean }> =>
  request(`${API_URL}/auth/admin/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

// ---------------------------------------------------------------------------
// Videos (public)
// ---------------------------------------------------------------------------
export const getVideos = (): Promise<Video[]> =>
  request(`${API_URL}/videos`);

export const getVideo = (id: string): Promise<Video> =>
  request(`${API_URL}/videos/${id}`);

export const scanVideos = (): Promise<ScanResult> =>
  request(`${API_URL}/videos/scan`, { method: "POST" });

export const getVideoStreamUrl = (id: string): string =>
  `${API_URL}/videos/${id}/stream`;

export const updateVideoDuration = (id: string, duration: number) =>
  request(`${API_URL}/videos/${id}/duration`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration }),
  });

// ---------------------------------------------------------------------------
// Feedback (authenticated)
// ---------------------------------------------------------------------------
export const getFeedback = (
  videoId: string,
  userName?: string
): Promise<Feedback[]> => {
  const params = new URLSearchParams({ videoId });
  if (userName) params.append("userName", userName);
  return request(`${API_URL}/feedback?${params}`);
};

export const createTextFeedback = (data: {
  videoId: string;
  userName: string;
  content: string;
  timestampSec: number;
}): Promise<Feedback> =>
  request(`${API_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, type: "TEXT" }),
  });

export const createAudioFeedback = (
  formData: FormData
): Promise<Feedback> =>
  request(`${API_URL}/feedback/audio`, {
    method: "POST",
    body: formData,
  });

export const updateFeedback = (
  id: string,
  content: string
): Promise<Feedback> =>
  request(`${API_URL}/feedback/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

export const deleteFeedback = (id: string): Promise<void> =>
  request(`${API_URL}/feedback/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Admin (requires x-admin-key)
// ---------------------------------------------------------------------------
/** Get all feedback for a video (admin – all users). */
export const getAllFeedback = (videoId: string): Promise<Feedback[]> =>
  request(`${API_URL}/feedback/admin/all?videoId=${videoId}`);

/** Get per-user feedback stats for a video. */
export const getFeedbackStats = (
  videoId: string
): Promise<FeedbackUserStat[]> =>
  request(`${API_URL}/feedback/stats/${videoId}`);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export const getExportUrl = (
  videoId: string,
  format: "json" | "csv",
  userName?: string
): string => {
  const params = new URLSearchParams({ videoId, format });
  if (userName) params.append("userName", userName);
  // Append auth tokens as query params for direct browser download
  const token = getUserToken();
  if (token) params.append("shareToken", token); // reuse shareToken param as fallback
  const adminKey = getAdminKey();
  if (adminKey) params.append("adminKey", adminKey);
  return `${API_URL}/export?${params}`;
};

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------
export const createShareLink = (
  videoId: string,
  userName: string
): Promise<ShareLinkResponse> =>
  request(`${API_URL}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId, userName }),
  });

export const getSharedData = (token: string): Promise<SharedData> =>
  request(`${API_URL}/share/${token}`);

// ---------------------------------------------------------------------------
// Audio URL helper (appends auth for authenticated serving)
// ---------------------------------------------------------------------------
export const SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:3001";

/** Build an authenticated audio URL for <audio> src attributes.
 *  Since HTML elements can't send custom headers, auth goes via query params. */
export function getAudioUrl(audioPath: string, shareToken?: string): string {
  const base = `${SERVER_BASE_URL}${audioPath}`;
  const token = getUserToken();
  const adminKey = getAdminKey();

  const params = new URLSearchParams();
  if (adminKey) {
    // Admin key must go as "adminKey" – the server middleware checks this param name
    params.append("adminKey", adminKey);
  } else if (shareToken) {
    params.append("shareToken", shareToken);
  } else if (token) {
    params.append("shareToken", token);
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
