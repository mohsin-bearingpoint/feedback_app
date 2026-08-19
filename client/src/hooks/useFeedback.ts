"use client";

import { useState, useCallback, useEffect } from "react";
import type { Feedback } from "@/types";
import * as api from "@/lib/api";

interface UseFeedbackOptions {
  videoId: string;
  userName: string;
}

export function useFeedback({ videoId, userName }: UseFeedbackOptions) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetch all feedback for this video + user. */
  const refresh = useCallback(async () => {
    if (!videoId || !userName) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getFeedback(videoId, userName);
      setFeedbacks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setIsLoading(false);
    }
  }, [videoId, userName]);

  // Load on mount and when deps change
  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Add text feedback. */
  const addTextFeedback = useCallback(
    async (content: string, timestampSec: number) => {
      try {
        setError(null);
        const fb = await api.createTextFeedback({
          videoId,
          userName,
          content,
          timestampSec,
        });
        setFeedbacks((prev) =>
          [...prev, fb].sort((a, b) => a.timestampSec - b.timestampSec)
        );
        return fb;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add feedback"
        );
        throw err;
      }
    },
    [videoId, userName]
  );

  /** Add audio feedback. */
  const addAudioFeedback = useCallback(
    async (audioBlob: Blob, timestampSec: number) => {
      try {
        setError(null);
        const formData = new FormData();
        formData.append("videoId", videoId);
        formData.append("userName", userName);
        formData.append("timestampSec", timestampSec.toString());

        // Determine extension from MIME type
        const ext = audioBlob.type.includes("mp4") ? ".mp4" : ".webm";
        formData.append("audio", audioBlob, `recording${ext}`);

        const fb = await api.createAudioFeedback(formData);
        setFeedbacks((prev) =>
          [...prev, fb].sort((a, b) => a.timestampSec - b.timestampSec)
        );
        return fb;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add audio feedback"
        );
        throw err;
      }
    },
    [videoId, userName]
  );

  /** Update a text feedback item. */
  const editFeedback = useCallback(
    async (id: string, content: string) => {
      try {
        setError(null);
        const updated = await api.updateFeedback(id, content);
        setFeedbacks((prev) =>
          prev.map((fb) => (fb.id === id ? updated : fb))
        );
        return updated;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update feedback"
        );
        throw err;
      }
    },
    []
  );

  /** Delete a feedback item. */
  const removeFeedback = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.deleteFeedback(id);
      setFeedbacks((prev) => prev.filter((fb) => fb.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete feedback"
      );
      throw err;
    }
  }, []);

  return {
    feedbacks,
    isLoading,
    error,
    refresh,
    addTextFeedback,
    addAudioFeedback,
    editFeedback,
    removeFeedback,
  };
}
