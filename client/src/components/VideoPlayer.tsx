"use client";

import { useCallback } from "react";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { formatTime } from "@/lib/utils";
import { getVideoStreamUrl, updateVideoDuration } from "@/lib/api";
import FeedbackTimeline from "./FeedbackTimeline";
import type { Feedback } from "@/types";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  MessageSquarePlus,
} from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  feedbacks: Feedback[];
  onSeek: (timestampSec: number) => void;
  onAddFeedback: (timestampSec: number) => void;
  currentActiveTimestamp?: number;
}

export default function VideoPlayer({
  videoId,
  feedbacks,
  onSeek,
  onAddFeedback,
}: VideoPlayerProps) {
  const {
    videoRef,
    containerRef,
    state,
    togglePlay,
    pause,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
  } = useVideoPlayer();

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      const time = fraction * state.duration;
      seek(time);
    },
    [seek, state.duration]
  );

  const handleSeek = useCallback(
    (time: number) => {
      seek(time);
      onSeek(time);
    },
    [seek, onSeek]
  );

  const handleAddFeedback = useCallback(() => {
    pause();
    onAddFeedback(videoRef.current?.currentTime || 0);
  }, [pause, onAddFeedback, videoRef]);

  const handleMetadataLoaded = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration && isFinite(video.duration)) {
      updateVideoDuration(videoId, video.duration).catch(() => {
        /* non-critical */
      });
    }
  }, [videoId, videoRef]);

  const progress = state.duration > 0
    ? (state.currentTime / state.duration) * 100
    : 0;

  const bufferedProgress = state.duration > 0
    ? (state.buffered / state.duration) * 100
    : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl bg-black group"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={getVideoStreamUrl(videoId)}
        className="w-full aspect-video bg-black"
        onClick={togglePlay}
        onLoadedMetadata={handleMetadataLoaded}
        playsInline
        preload="metadata"
      />

      {/* Play overlay (shown when paused) */}
      {!state.isPlaying && state.currentTime === 0 && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/30"
          onClick={togglePlay}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform hover:scale-110">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </button>
      )}

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress bar */}
        <div
          className="relative mb-3 h-1.5 cursor-pointer rounded-full bg-gray-700 hover:h-2.5 transition-all"
          onClick={handleProgressClick}
        >
          {/* Buffered */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gray-600"
            style={{ width: `${bufferedProgress}%` }}
          />
          {/* Progress */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary-500"
            style={{ width: `${progress}%` }}
          />
          {/* Playhead */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-primary-400 border-2 border-white shadow-md -ml-1.5"
            style={{ left: `${progress}%` }}
          />
          {/* Feedback markers */}
          <FeedbackTimeline
            feedbacks={feedbacks}
            duration={state.duration}
            onSeek={handleSeek}
          />
        </div>

        {/* Button row */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="btn-icon">
            {state.isPlaying ? (
              <Pause className="h-5 w-5 text-white" />
            ) : (
              <Play className="h-5 w-5 text-white" />
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1">
            <button onClick={toggleMute} className="btn-icon">
              {state.isMuted || state.volume === 0 ? (
                <VolumeX className="h-5 w-5 text-white" />
              ) : (
                <Volume2 className="h-5 w-5 text-white" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.isMuted ? 0 : state.volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-primary-500"
            />
          </div>

          {/* Time display */}
          <span className="text-xs font-mono text-gray-300">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add feedback button */}
          <button
            onClick={handleAddFeedback}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-primary-600"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Feedback</span>
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="btn-icon">
            {state.isFullscreen ? (
              <Minimize className="h-5 w-5 text-white" />
            ) : (
              <Maximize className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
