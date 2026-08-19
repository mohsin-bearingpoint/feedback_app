"use client";

import { useState } from "react";
import { getExportUrl } from "@/lib/api";
import { Download, ChevronDown } from "lucide-react";

interface ExportButtonProps {
  videoId: string;
  userName?: string;
}

export default function ExportButton({ videoId, userName }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: "json" | "csv") => {
    const url = getExportUrl(videoId, format, userName);
    window.open(url, "_blank");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary gap-1 text-xs"
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
            <button
              onClick={() => handleExport("json")}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Export as JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Export as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
