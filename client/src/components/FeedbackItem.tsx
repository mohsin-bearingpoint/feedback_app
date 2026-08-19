"use client";

import { useState } from "react";
import type { Feedback } from "@/types";
import { formatTime, stringToColor, getInitials } from "@/lib/utils";
import { getAudioUrl } from "@/lib/api";
import {
  MessageSquare,
  Mic,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
} from "lucide-react";

interface FeedbackItemProps {
  feedback: Feedback;
  onSeek: (timestampSec: number) => void;
  onEdit: (id: string, content: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  isActive: boolean;
  readOnly?: boolean;
  /** Pass a share token for audio playback on shared views. */
  shareToken?: string;
}

export default function FeedbackItem({
  feedback,
  onSeek,
  onEdit,
  onDelete,
  isActive,
  readOnly = false,
  shareToken,
}: FeedbackItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(feedback.content);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === feedback.content) {
      setIsEditing(false);
      return;
    }
    await onEdit(feedback.id, trimmed);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(feedback.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const avatarColor = stringToColor(feedback.userName);

  return (
    <div
      className={`group rounded-lg border p-3 transition-colors cursor-pointer ${
        isActive
          ? "border-primary-500 bg-primary-950/30"
          : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
      }`}
      onClick={() => onSeek(feedback.timestampSec)}
    >
      {/* Header row */}
      <div className="mb-2 flex items-center gap-2">
        {/* Avatar */}
        <div
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: avatarColor }}
        >
          {getInitials(feedback.userName)}
        </div>

        <span className="text-xs font-medium text-gray-300">
          {feedback.userName}
        </span>

        {/* Timestamp badge */}
        <button
          className="ml-auto flex items-center gap-1 rounded-md bg-gray-800 px-2 py-0.5 text-xs font-mono text-primary-400 hover:bg-gray-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onSeek(feedback.timestampSec);
          }}
        >
          <Clock className="h-3 w-3" />
          {formatTime(feedback.timestampSec)}
        </button>

        {/* Type icon */}
        {feedback.type === "TEXT" ? (
          <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-gray-500" />
        )}
      </div>

      {/* Content */}
      <div className="pl-8" onClick={(e) => e.stopPropagation()}>
        {feedback.type === "TEXT" ? (
          isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="input min-h-[60px] resize-none text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
                <button
                  onClick={() => {
                    setEditContent(feedback.content);
                    setIsEditing(false);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {feedback.content}
            </p>
          )
        ) : (
          <audio
            src={getAudioUrl(feedback.content, shareToken)}
            controls
            className="h-8 w-full"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Action buttons */}
        {!readOnly && !isEditing && (
          <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {feedback.type === "TEXT" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
