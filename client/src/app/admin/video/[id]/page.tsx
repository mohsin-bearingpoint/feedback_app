"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import type { Video, Feedback, FeedbackUserStat } from "@/types";
import {
  getVideo,
  getAllFeedback,
  getFeedbackStats,
  getExportUrl,
} from "@/lib/api";
import VideoPlayer from "@/components/VideoPlayer";
import FeedbackItem from "@/components/FeedbackItem";
import AdminLoginPrompt from "@/components/AdminLoginPrompt";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { stringToColor, getInitials } from "@/lib/utils";
import {
  ArrowLeft,
  Film,
  ShieldCheck,
  Users,
  MessageCircle,
  Download,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";

export default function AdminVideoPage() {
  const params = useParams();
  const videoId = params.id as string;
  const { isAuthenticated, isLoaded: authLoaded, isVerifying, error: authError, login } =
    useAdminAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [userStats, setUserStats] = useState<FeedbackUserStat[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);

  // Load video + all feedback + user stats (only when authenticated)
  useEffect(() => {
    if (!videoId || !isAuthenticated) return;
    (async () => {
      try {
        setIsLoading(true);
        const [videoData, feedbackData, statsData] = await Promise.all([
          getVideo(videoId),
          getAllFeedback(videoId),
          getFeedbackStats(videoId),
        ]);
        setVideo(videoData);
        setFeedbacks(feedbackData);
        setUserStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [videoId, isAuthenticated]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    currentTimeRef.current = time;
    // Also seek the video element
    const videoEl = document.querySelector("video");
    if (videoEl) videoEl.currentTime = time;
  }, []);

  // Track current time
  useEffect(() => {
    const interval = setInterval(() => {
      const videoEl = document.querySelector("video");
      if (videoEl) {
        const t = videoEl.currentTime;
        if (Math.abs(t - currentTimeRef.current) > 0.5) {
          currentTimeRef.current = t;
          setCurrentTime(t);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Filter feedbacks by selected user
  const displayedFeedbacks = selectedUser
    ? feedbacks.filter((f) => f.userName === selectedUser)
    : feedbacks;

  const totalUsers = userStats.length;
  const totalFeedbacks = feedbacks.length;

  // Auth gate
  if (!authLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <AdminLoginPrompt
        onSubmit={login}
        isVerifying={isVerifying}
        error={authError}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Film className="h-16 w-16 text-gray-700" />
        <p className="text-red-400">{error || "Video not found"}</p>
        <Link href="/admin" className="btn-primary">
          Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin" className="btn-icon">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <ShieldCheck className="h-5 w-5 text-amber-400" />
        <h1 className="text-lg font-semibold text-white truncate">
          {video.title}
        </h1>
        <span className="rounded-full bg-amber-900/40 border border-amber-700/50 px-2.5 py-0.5 text-xs text-amber-300">
          Admin View
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Video player */}
        <div className="flex-1 min-w-0 lg:max-w-[60%]">
          <VideoPlayer
            videoId={videoId}
            feedbacks={displayedFeedbacks}
            onSeek={handleSeek}
            onAddFeedback={() => {}}
          />

          {/* Stats cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="card p-3">
              <div className="flex items-center gap-2 text-gray-400">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">Total Feedback</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {totalFeedbacks}
              </p>
            </div>
            <div className="card p-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Users className="h-4 w-4" />
                <span className="text-xs">Users</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {totalUsers}
              </p>
            </div>
            <div className="card p-3 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-gray-400">
                <Download className="h-4 w-4" />
                <span className="text-xs">Export All</span>
              </div>
              <div className="mt-1.5 flex gap-2">
                <a
                  href={getExportUrl(videoId, "json")}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs py-1"
                >
                  JSON
                </a>
                <a
                  href={getExportUrl(videoId, "csv")}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs py-1"
                >
                  CSV
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: user filter + feedback list */}
        <div className="card flex-shrink-0 lg:w-[40%] lg:max-h-[calc(100vh-100px)] overflow-hidden flex flex-col">
          {/* Panel header */}
          <div className="border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary-400" />
                <h2 className="text-sm font-semibold text-white">
                  All Feedback
                </h2>
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                  {displayedFeedbacks.length}
                </span>
              </div>
              {selectedUser && (
                <button
                  onClick={() => setSelectedUser(null)}
                  className="inline-flex items-center gap-1 rounded-md bg-primary-900/40 border border-primary-700/50 px-2 py-1 text-xs text-primary-300 hover:bg-primary-900/60 transition-colors"
                >
                  <Filter className="h-3 w-3" />
                  {selectedUser}
                  <X className="h-3 w-3 ml-1" />
                </button>
              )}
            </div>
          </div>

          {/* User chips (filter bar) */}
          {userStats.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-gray-800 px-4 py-3">
              <button
                onClick={() => setSelectedUser(null)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedUser === null
                    ? "bg-primary-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                All ({totalFeedbacks})
              </button>
              {userStats.map((stat) => (
                <button
                  key={stat.userName}
                  onClick={() =>
                    setSelectedUser(
                      selectedUser === stat.userName ? null : stat.userName
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedUser === stat.userName
                      ? "bg-primary-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    style={{ backgroundColor: stringToColor(stat.userName) }}
                  >
                    {getInitials(stat.userName)}
                  </span>
                  {stat.userName} ({stat.count})
                </button>
              ))}
            </div>
          )}

          {/* Feedback list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {displayedFeedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="mb-3 h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-500">
                  {selectedUser
                    ? `No feedback from ${selectedUser}`
                    : "No feedback on this video yet"}
                </p>
              </div>
            ) : (
              displayedFeedbacks.map((fb) => (
                <FeedbackItem
                  key={fb.id}
                  feedback={fb}
                  onSeek={handleSeek}
                  onEdit={async () => {}}
                  onDelete={async () => {}}
                  isActive={Math.abs(fb.timestampSec - currentTime) < 2}
                  readOnly
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
