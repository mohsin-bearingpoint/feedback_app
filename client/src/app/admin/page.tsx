"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Video } from "@/types";
import { getVideos, scanVideos } from "@/lib/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AdminLoginPrompt from "@/components/AdminLoginPrompt";
import {
  Film,
  RefreshCw,
  MessageCircle,
  Clock,
  ShieldCheck,
  ArrowLeft,
  LogOut,
} from "lucide-react";

export default function AdminPage() {
  const { isAuthenticated, isLoaded, isVerifying, error, login, logout } =
    useAdminAuth();

  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await getVideos();
      setVideos(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load videos"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleScan = async () => {
    try {
      setIsScanning(true);
      setLoadError(null);
      await scanVideos();
      await loadVideos();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadVideos();
  }, [isAuthenticated, loadVideos]);

  // Loading auth state
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Admin login gate
  if (!isAuthenticated) {
    return (
      <AdminLoginPrompt
        onSubmit={login}
        isVerifying={isVerifying}
        error={error}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-icon">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-amber-400" />
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              View all videos and feedback from all users
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={logout} className="btn-secondary gap-1.5 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="btn-primary"
          >
            <RefreshCw
              className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`}
            />
            {isScanning ? "Scanning..." : "Scan Videos"}
          </button>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
          {loadError}
        </div>
      )}

      {/* Video list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Film className="mb-4 h-16 w-16 text-gray-700" />
          <h2 className="text-lg font-medium text-gray-400">
            No videos found
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Place video files in{" "}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 text-primary-400">
              server/videos/
            </code>{" "}
            and click &quot;Scan Videos&quot;.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/admin/video/${video.id}`}
              className="card flex items-center gap-4 p-4 transition-colors hover:border-gray-700 group"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-800 group-hover:bg-gray-750">
                <Film className="h-6 w-6 text-gray-500" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white group-hover:text-primary-400 transition-colors truncate">
                  {video.title}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {video.filename}
                </p>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>
                    {video.duration
                      ? `${Math.floor(video.duration / 60)}:${Math.floor(
                          video.duration % 60
                        )
                          .toString()
                          .padStart(2, "0")}`
                      : "--:--"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <MessageCircle className="h-4 w-4" />
                  <span>{video._count?.feedbacks ?? 0} total</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
