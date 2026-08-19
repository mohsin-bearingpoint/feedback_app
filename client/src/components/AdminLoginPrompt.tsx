"use client";

import { useState } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";

interface AdminLoginPromptProps {
  onSubmit: (password: string) => Promise<void>;
  isVerifying: boolean;
  error: string | null;
}

export default function AdminLoginPrompt({
  onSubmit,
  isVerifying,
  error,
}: AdminLoginPromptProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    try {
      await onSubmit(password);
    } catch {
      // Error is handled via the error prop
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-amber-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">
              Admin Access
            </h2>
            <p className="text-sm text-gray-400">
              Enter the admin password to continue
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="input text-base"
            autoFocus
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={!password.trim() || isVerifying}
            className="btn-primary w-full"
          >
            {isVerifying ? "Verifying..." : "Authenticate"}
          </button>
        </form>
      </div>
    </div>
  );
}
