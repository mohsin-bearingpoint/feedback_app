"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Video } from "@/types";
import { getVideos, scanVideos } from "@/lib/api";
import { useUserName } from "@/hooks/useUserName";
import UserNamePrompt from "@/components/UserNamePrompt";
import {
  Film,
  RefreshCw,
  MessageCircle,
  Clock,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  const { userName, isLoaded, setUserName, clearUserName } = useUserName();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getVideos();
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleScan = async () => {
    try {
      setIsScanning(true);
      setError(null);
      await scanVideos();
      await loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  // Re-fetch when userName changes (e.g. after sign-in) so the
  // server returns user-scoped feedback counts with the new token.
  useEffect(() => {
    if (userName) loadVideos();
  }, [loadVideos, userName]);

  // Show loading while checking localStorage
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Show name prompt if no username set
  if (!userName) {
    return <UserNamePrompt onSubmit={setUserName} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Film className="h-7 w-7 text-primary-400" />
            Video Feedback
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Select a video to leave timestamped feedback
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin link */}
          <Link
            href="/admin"
            className="btn-secondary gap-1.5"
            title="Admin Dashboard"
          >
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Admin</span>
          </Link>

          {/* User info */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">{userName}</span>
            <button
              onClick={clearUserName}
              className="ml-1 text-gray-500 hover:text-gray-300 transition-colors"
              title="Change user"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scan button */}
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
      {error && (
        <div className="mb-6 rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Video grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Film className="mb-4 h-16 w-16 text-gray-700" />
          <h2 className="text-lg font-medium text-gray-400">No videos found</h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Place video files (.mp4, .webm, .ogg, .mov) in the{" "}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 text-primary-400">
              server/videos/
            </code>{" "}
            directory, then click &quot;Scan Videos&quot; to load them.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/video/${video.id}`}
              className="card group overflow-hidden transition-colors hover:border-gray-700"
            >
              {/* Thumbnail placeholder */}
              <div className="flex aspect-video items-center justify-center bg-gray-800 transition-colors group-hover:bg-gray-750">
                <Film className="h-12 w-12 text-gray-600" />
              </div>

              <div className="p-4">
                <h3 className="font-medium text-white group-hover:text-primary-400 transition-colors">
                  {video.title}
                </h3>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {video.duration
                      ? `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : "Unknown"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {video._count?.feedbacks ?? 0} comments
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600 truncate">
                  {video.filename}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
