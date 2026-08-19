import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";

const prisma = new PrismaClient();

const createSessionSchema = z.object({
  userName: z.string().min(1, "Name is required").max(100),
});

const verifyAdminSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

/**
 * Create a user session. Returns a token the client stores and sends
 * with every subsequent request.
 */
export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userName } = createSessionSchema.parse(req.body);

    // Check if a session already exists for this userName
    const existing = await prisma.userSession.findFirst({
      where: { userName },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      // Return the existing session token
      res.json({ token: existing.token, userName: existing.userName });
      return;
    }

    // Create a new session
    const session = await prisma.userSession.create({
      data: {
        userName,
        token: uuidv4(),
      },
    });

    res.status(201).json({
      token: session.token,
      userName: session.userName,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify admin password. Returns success or 401.
 * This endpoint does NOT create a token – the client simply stores
 * the password in sessionStorage and sends it as x-admin-key.
 */
export const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { password } = verifyAdminSchema.parse(req.body);
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      throw new AppError(500, "ADMIN_PASSWORD not configured on server");
    }

    if (password !== adminPassword) {
      throw new AppError(401, "Invalid admin password");
    }

    res.json({ authenticated: true });
  } catch (error) {
    next(error);
  }
};
