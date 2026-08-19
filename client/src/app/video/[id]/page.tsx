"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Video } from "@/types";
import { getVideo } from "@/lib/api";
import { useUserName } from "@/hooks/useUserName";
import { useFeedback } from "@/hooks/useFeedback";
import VideoPlayer from "@/components/VideoPlayer";
import FeedbackPanel from "@/components/FeedbackPanel";
import UserNamePrompt from "@/components/UserNamePrompt";
import { ArrowLeft, Film } from "lucide-react";
import Link from "next/link";

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const { userName, isLoaded, setUserName } = useUserName();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [addingAtTimestamp, setAddingAtTimestamp] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);

  // Load video metadata
  useEffect(() => {
    if (!videoId) return;
    (async () => {
      try {
        setIsLoadingVideo(true);
        const data = await getVideo(videoId);
        setVideo(data);
      } catch (err) {
        setVideoError(
          err instanceof Error ? err.message : "Failed to load video"
        );
      } finally {
        setIsLoadingVideo(false);
      }
    })();
  }, [videoId]);

  // Feedback hook (only active when we have a userName)
  const {
    feedbacks,
    isLoading: isFeedbackLoading,
    error: feedbackError,
    addTextFeedback,
    addAudioFeedback,
    editFeedback,
    removeFeedback,
  } = useFeedback({
    videoId,
    userName: userName || "",
  });

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    currentTimeRef.current = time;
  }, []);

  const handleAddFeedback = useCallback((timestampSec: number) => {
    setAddingAtTimestamp(timestampSec);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setAddingAtTimestamp(null);
  }, []);

  // Track current time from the video player for highlighting active feedback
  useEffect(() => {
    const interval = setInterval(() => {
      // We'll read from the video element directly via a query
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

  // Loading states
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!userName) {
    return <UserNamePrompt onSubmit={setUserName} />;
  }

  if (isLoadingVideo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (videoError || !video) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Film className="h-16 w-16 text-gray-700" />
        <p className="text-red-400">{videoError || "Video not found"}</p>
        <button onClick={() => router.push("/")} className="btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/" className="btn-icon">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-white truncate">
          {video.title}
        </h1>
      </div>

      {/* Main layout: video + feedback panel */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Video player */}
        <div className="flex-1 min-w-0 lg:max-w-[65%]">
          <VideoPlayer
            videoId={videoId}
            feedbacks={feedbacks}
            onSeek={handleSeek}
            onAddFeedback={handleAddFeedback}
            currentActiveTimestamp={currentTime}
          />
        </div>

        {/* Feedback panel */}
        <div className="card flex-shrink-0 lg:w-[35%] lg:max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
          <FeedbackPanel
            videoId={videoId}
            userName={userName}
            feedbacks={feedbacks}
            isLoading={isFeedbackLoading}
            error={feedbackError}
            currentTime={currentTime}
            addingAtTimestamp={addingAtTimestamp}
            onAddTextFeedback={addTextFeedback}
            onAddAudioFeedback={addAudioFeedback}
            onEditFeedback={editFeedback}
            onDeleteFeedback={removeFeedback}
            onSeek={handleSeek}
            onCancelAdd={handleCancelAdd}
          />
        </div>
      </div>
    </div>
  );
}
