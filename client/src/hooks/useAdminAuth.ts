"use client";

import { useState, useCallback, useEffect } from "react";
import { verifyAdminPassword } from "@/lib/api";

const STORAGE_KEY = "feedback_app_admin_key";

/**
 * Manages admin authentication.
 * The admin password is stored in sessionStorage (cleared when browser closes).
 */
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setIsAuthenticated(true);
    }
    setIsLoaded(true);
  }, []);

  const login = useCallback(async (password: string) => {
    setIsVerifying(true);
    setError(null);
    try {
      await verifyAdminPassword(password);
      sessionStorage.setItem(STORAGE_KEY, password);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, isLoaded, isVerifying, error, login, logout };
}
