"use client";

import { useState, useRef, useCallback } from "react";

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

/**
 * Cross-browser audio recorder hook.
 * Supports Chrome/Firefox (WebM Opus) and Safari/iOS (MP4 AAC).
 */
export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /** Determine the best supported MIME type for the current browser. */
  const getMimeType = useCallback((): string => {
    if (typeof MediaRecorder === "undefined") return "";
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  }, []);

  /** Start recording from the microphone. */
  const startRecording = useCallback(async () => {
    try {
      // Reset state
      setState((s) => ({
        ...s,
        error: null,
        audioBlob: null,
        audioUrl: null,
        duration: 0,
      }));

      const mimeType = getMimeType();
      if (!mimeType) {
        setState((s) => ({
          ...s,
          error: "Audio recording is not supported in this browser.",
        }));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setState((s) => ({
          ...s,
          isRecording: false,
          isPaused: false,
          audioBlob: blob,
          audioUrl: url,
        }));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.onerror = () => {
        setState((s) => ({
          ...s,
          error: "Recording failed. Please try again.",
          isRecording: false,
        }));
      };

      // Request data every 250ms for smoother chunks
      recorder.start(250);

      // Duration timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setState((s) => ({
          ...s,
          duration: (Date.now() - startTime) / 1000,
        }));
      }, 100);

      setState((s) => ({ ...s, isRecording: true, isPaused: false }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Microphone access denied";
      setState((s) => ({ ...s, error: message }));
    }
  }, [getMimeType]);

  /** Stop recording. */
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /** Reset recorded audio so the user can re-record. */
  const resetRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    // Stop stream if still running
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
    });
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
