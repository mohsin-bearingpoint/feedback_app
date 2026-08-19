"use client";

import { useState } from "react";

interface UserNamePromptProps {
  onSubmit: (name: string) => void;
}

export default function UserNamePrompt({ onSubmit }: UserNamePromptProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-8">
        <h2 className="mb-2 text-xl font-semibold text-white">
          Welcome
        </h2>
        <p className="mb-6 text-sm text-gray-400">
          Enter your name to start leaving feedback on videos. Your name will be
          attached to all your comments.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="input text-base"
            autoFocus
            maxLength={100}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="btn-primary w-full"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
