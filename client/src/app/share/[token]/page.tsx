"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import type { SharedData } from "@/types";
import { getSharedData } from "@/lib/api";
import VideoPlayer from "@/components/VideoPlayer";
import FeedbackPanel from "@/components/FeedbackPanel";
import { Film, Share2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setIsLoading(true);
        const result = await getSharedData(token);
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load shared feedback"
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    currentTimeRef.current = time;
  }, []);

  // Track current video time
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-xl font-semibold text-white">
          {error?.includes("expired")
            ? "Link Expired"
            : "Link Not Found"}
        </h2>
        <p className="max-w-md text-sm text-gray-400">
          {error || "This share link is invalid or has been removed."}
        </p>
        <Link href="/" className="btn-primary">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <Share2 className="h-5 w-5 text-primary-400" />
        <h1 className="text-lg font-semibold text-white truncate">
          {data.video.title}
        </h1>
        <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
          Shared by {data.userName} (read-only)
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 min-w-0 lg:max-w-[65%]">
          <VideoPlayer
            videoId={data.video.id}
            feedbacks={data.feedbacks}
            onSeek={handleSeek}
            onAddFeedback={() => {}}
          />
        </div>

        <div className="card flex-shrink-0 lg:w-[35%] lg:max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
          <FeedbackPanel
            videoId={data.video.id}
            userName={data.userName}
            feedbacks={data.feedbacks}
            isLoading={false}
            error={null}
            currentTime={currentTime}
            addingAtTimestamp={null}
            onAddTextFeedback={async () => {}}
            onAddAudioFeedback={async () => {}}
            onEditFeedback={async () => {}}
            onDeleteFeedback={async () => {}}
            onSeek={handleSeek}
            onCancelAdd={() => {}}
            readOnly
            shareToken={token}
          />
        </div>
      </div>
    </div>
  );
}
