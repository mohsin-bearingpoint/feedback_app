"use client";

import { useState } from "react";
import { createShareLink } from "@/lib/api";
import { Share2, Copy, Check } from "lucide-react";

interface ShareButtonProps {
  videoId: string;
  userName: string;
}

export default function ShareButton({ videoId, userName }: ShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (shareUrl) {
      // Already have a link, just toggle display
      setShareUrl(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await createShareLink(videoId, userName);
      setShareUrl(data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={isLoading}
        className="btn-secondary gap-1 text-xs"
      >
        <Share2 className="h-3.5 w-3.5" />
        {isLoading ? "Creating..." : "Share"}
      </button>

      {shareUrl && (
        <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-xl">
          <p className="mb-2 text-xs text-gray-400">
            Anyone with this link can view your feedback (read-only):
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="input flex-1 text-xs"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="btn-icon flex-shrink-0"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
