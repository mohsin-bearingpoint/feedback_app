"use client";

import { useState, useCallback, useEffect } from "react";
import { createSession } from "@/lib/api";

const NAME_KEY = "feedback_app_username";
const TOKEN_KEY = "feedback_app_token";

/**
 * Manages the user's display name and session token.
 * On name entry, calls the server to create/retrieve a session token.
 */
export function useUserName() {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    const storedName = localStorage.getItem(NAME_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedName && storedToken) {
      setUserNameState(storedName);
    }
    setIsLoaded(true);
  }, []);

  const setUserName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsCreatingSession(true);
    try {
      // Create or retrieve session from server
      const { token, userName: serverName } = await createSession(trimmed);
      localStorage.setItem(NAME_KEY, serverName);
      localStorage.setItem(TOKEN_KEY, token);
      setUserNameState(serverName);
    } catch (err) {
      console.error("Failed to create session:", err);
      // Fallback: store name locally without a token (will fail on auth calls)
      localStorage.setItem(NAME_KEY, trimmed);
      setUserNameState(trimmed);
    } finally {
      setIsCreatingSession(false);
    }
  }, []);

  const clearUserName = useCallback(() => {
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUserNameState(null);
  }, []);

  return { userName, isLoaded, isCreatingSession, setUserName, clearUserName };
}
