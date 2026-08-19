import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "./errorHandler";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Extend Express Request to carry authenticated user info
// ---------------------------------------------------------------------------
declare global {
  namespace Express {
    interface Request {
      /** Set by userAuth middleware after validating the session token. */
      sessionUser?: { userName: string; sessionId: string };
      /** Set by adminAuth middleware. */
      isAdmin?: boolean;
    }
  }
}

// ---------------------------------------------------------------------------
// Admin auth: validates x-admin-key header against ADMIN_PASSWORD env var
// ---------------------------------------------------------------------------
export const adminAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    next(new AppError(500, "ADMIN_PASSWORD not configured on server"));
    return;
  }

  const providedKey = req.headers["x-admin-key"] as string | undefined;
  if (!providedKey || providedKey !== adminPassword) {
    next(new AppError(401, "Invalid admin credentials"));
    return;
  }

  req.isAdmin = true;
  next();
};

// ---------------------------------------------------------------------------
// Optional user auth: attaches sessionUser if a valid token is present,
// but does NOT reject the request if no token is provided.
// ---------------------------------------------------------------------------
export const optionalUserAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token) {
        const session = await prisma.userSession.findUnique({
          where: { token },
        });
        if (session) {
          req.sessionUser = {
            userName: session.userName,
            sessionId: session.id,
          };
        }
      }
    }
    next();
  } catch {
    // Non-fatal – proceed without auth
    next();
  }
};

// ---------------------------------------------------------------------------
// User auth: validates Authorization: Bearer <session-token>
// Looks up the token in UserSession and attaches userName to req.
// ---------------------------------------------------------------------------
export const userAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Authentication required");
    }

    const token = authHeader.slice(7); // strip "Bearer "
    if (!token) {
      throw new AppError(401, "Authentication required");
    }

    const session = await prisma.userSession.findUnique({
      where: { token },
    });

    if (!session) {
      throw new AppError(401, "Invalid or expired session");
    }

    req.sessionUser = {
      userName: session.userName,
      sessionId: session.id,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Combined auth: accepts EITHER a valid user session OR a valid admin key.
// Useful for endpoints that both users and admins can access.
// ---------------------------------------------------------------------------
export const userOrAdminAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Try admin key from header OR query param (for direct browser downloads)
    const adminKey =
      (req.headers["x-admin-key"] as string | undefined) ||
      (req.query.adminKey as string | undefined);
    if (adminKey && adminPassword && adminKey === adminPassword) {
      req.isAdmin = true;
      next();
      return;
    }

    // Try user session token from header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token) {
        const session = await prisma.userSession.findUnique({
          where: { token },
        });
        if (session) {
          req.sessionUser = {
            userName: session.userName,
            sessionId: session.id,
          };
          next();
          return;
        }
      }
    }

    // Try share token from query param (for audio playback & exports on shared links)
    const shareToken = req.query.shareToken as string | undefined;
    if (shareToken) {
      // First check if it's a user session token
      const session = await prisma.userSession.findUnique({
        where: { token: shareToken },
      });
      if (session) {
        req.sessionUser = {
          userName: session.userName,
          sessionId: session.id,
        };
        next();
        return;
      }

      // Then check if it's a share link token
      const shareLink = await prisma.shareLink.findUnique({
        where: { token: shareToken },
      });
      if (shareLink) {
        if (!shareLink.expiresAt || shareLink.expiresAt > new Date()) {
          req.sessionUser = {
            userName: shareLink.userName,
            sessionId: "share",
          };
          next();
          return;
        }
      }
    }

    throw new AppError(401, "Authentication required");
  } catch (error) {
    next(error);
  }
};
