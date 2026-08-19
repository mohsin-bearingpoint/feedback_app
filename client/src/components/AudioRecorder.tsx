"use client";

import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { formatTime } from "@/lib/utils";
import { Mic, Square, RotateCcw, Check } from "lucide-react";

interface AudioRecorderProps {
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export default function AudioRecorder({ onSave, onCancel }: AudioRecorderProps) {
  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const handleSave = () => {
    if (audioBlob) {
      onSave(audioBlob);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Recording controls */}
      <div className="flex items-center gap-3">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="btn-primary gap-2"
            type="button"
          >
            <Mic className="h-4 w-4" />
            Start Recording
          </button>
        )}

        {isRecording && (
          <>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              type="button"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-mono text-gray-300">
                {formatTime(duration)}
              </span>
            </div>
          </>
        )}

        {audioBlob && !isRecording && (
          <div className="flex items-center gap-2">
            <button
              onClick={resetRecording}
              className="btn-secondary gap-1"
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              Re-record
            </button>
            <button
              onClick={handleSave}
              className="btn-primary gap-1"
              type="button"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        )}

        <button
          onClick={() => {
            resetRecording();
            onCancel();
          }}
          className="btn-secondary ml-auto"
          type="button"
        >
          Cancel
        </button>
      </div>

      {/* Audio preview */}
      {audioUrl && (
        <audio
          src={audioUrl}
          controls
          className="w-full h-10 rounded-lg"
        />
      )}
    </div>
  );
}
