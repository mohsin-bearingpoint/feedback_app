"use client";

import { useState } from "react";
import type { Feedback } from "@/types";
import FeedbackItem from "./FeedbackItem";
import AudioRecorder from "./AudioRecorder";
import ExportButton from "./ExportButton";
import ShareButton from "./ShareButton";
import { formatTime } from "@/lib/utils";
import {
  MessageSquare,
  Mic,
  X,
  Send,
  MessageCircle,
} from "lucide-react";

interface FeedbackPanelProps {
  videoId: string;
  userName: string;
  feedbacks: Feedback[];
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  /** The timestamp at which the "add feedback" was triggered (null if not adding). */
  addingAtTimestamp: number | null;
  onAddTextFeedback: (content: string, timestampSec: number) => Promise<unknown>;
  onAddAudioFeedback: (blob: Blob, timestampSec: number) => Promise<unknown>;
  onEditFeedback: (id: string, content: string) => Promise<unknown>;
  onDeleteFeedback: (id: string) => Promise<unknown>;
  onSeek: (timestampSec: number) => void;
  onCancelAdd: () => void;
  readOnly?: boolean;
  /** Pass share token for audio playback on shared views. */
  shareToken?: string;
}

type FeedbackMode = "text" | "audio";

export default function FeedbackPanel({
  videoId,
  userName,
  feedbacks,
  isLoading,
  error,
  currentTime,
  addingAtTimestamp,
  onAddTextFeedback,
  onAddAudioFeedback,
  onEditFeedback,
  onDeleteFeedback,
  onSeek,
  onCancelAdd,
  readOnly = false,
  shareToken,
}: FeedbackPanelProps) {
  const [mode, setMode] = useState<FeedbackMode>("text");
  const [textContent, setTextContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmitText = async () => {
    if (!textContent.trim() || addingAtTimestamp === null) return;
    setIsSaving(true);
    try {
      await onAddTextFeedback(textContent.trim(), addingAtTimestamp);
      setTextContent("");
      onCancelAdd();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAudio = async (blob: Blob) => {
    if (addingAtTimestamp === null) return;
    setIsSaving(true);
    try {
      await onAddAudioFeedback(blob, addingAtTimestamp);
      onCancelAdd();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary-400" />
          <h2 className="text-sm font-semibold text-white">
            Feedback
          </h2>
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {feedbacks.length}
          </span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <ExportButton videoId={videoId} userName={userName} />
            <ShareButton videoId={videoId} userName={userName} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Add feedback form */}
      {addingAtTimestamp !== null && !readOnly && (
        <div className="mx-4 mt-3 rounded-lg border border-primary-700 bg-primary-950/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-primary-300">
              Feedback at {formatTime(addingAtTimestamp)}
            </span>
            <button
              onClick={onCancelAdd}
              className="btn-icon h-6 w-6"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="mb-3 flex rounded-lg border border-gray-700 bg-gray-800 p-0.5">
            <button
              onClick={() => setMode("text")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "text"
                  ? "bg-primary-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Text
            </button>
            <button
              onClick={() => setMode("audio")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "audio"
                  ? "bg-primary-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              Audio
            </button>
          </div>

          {/* Text input */}
          {mode === "text" && (
            <div className="space-y-2">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your feedback..."
                className="input min-h-[80px] resize-none text-sm"
                maxLength={5000}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleSubmitText();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Ctrl+Enter to submit
                </span>
                <button
                  onClick={handleSubmitText}
                  disabled={!textContent.trim() || isSaving}
                  className="btn-primary gap-1 text-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Submit"}
                </button>
              </div>
            </div>
          )}

          {/* Audio recorder */}
          {mode === "audio" && (
            <AudioRecorder
              onSave={handleSubmitAudio}
              onCancel={onCancelAdd}
            />
          )}
        </div>
      )}

      {/* Feedback list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="mb-3 h-10 w-10 text-gray-700" />
            <p className="text-sm text-gray-500">No feedback yet</p>
            <p className="mt-1 text-xs text-gray-600">
              {readOnly
                ? "No comments have been added to this video."
                : "Click \"Add Feedback\" on the video player to get started."}
            </p>
          </div>
        ) : (
          feedbacks.map((fb) => (
            <FeedbackItem
              key={fb.id}
              feedback={fb}
              onSeek={onSeek}
              onEdit={onEditFeedback}
              onDelete={onDeleteFeedback}
              isActive={
                Math.abs(fb.timestampSec - currentTime) < 2
              }
              readOnly={readOnly}
              shareToken={shareToken}
            />
          ))
        )}
      </div>
    </div>
  );
}
