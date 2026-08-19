"use client";

import type { Feedback } from "@/types";
import { formatTime } from "@/lib/utils";

interface FeedbackTimelineProps {
  feedbacks: Feedback[];
  duration: number;
  onSeek: (timestampSec: number) => void;
}

/**
 * Renders colored markers on the video progress bar
 * at positions where feedback exists.
 */
export default function FeedbackTimeline({
  feedbacks,
  duration,
  onSeek,
}: FeedbackTimelineProps) {
  if (!duration || duration <= 0) return null;

  return (
    <>
      {feedbacks.map((fb) => {
        const position = (fb.timestampSec / duration) * 100;
        if (position < 0 || position > 100) return null;

        return (
          <button
            key={fb.id}
            className="absolute top-1/2 -translate-y-1/2 z-10 group/marker"
            style={{ left: `${position}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onSeek(fb.timestampSec);
            }}
            title={`${formatTime(fb.timestampSec)} - ${fb.type === "TEXT" ? fb.content.slice(0, 50) : "Audio feedback"}`}
          >
            <div
              className={`h-3 w-3 rounded-full border-2 border-gray-900 transition-transform group-hover/marker:scale-150 ${
                fb.type === "TEXT" ? "bg-primary-400" : "bg-emerald-400"
              }`}
            />
          </button>
        );
      })}
    </>
  );
}
