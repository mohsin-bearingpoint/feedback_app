import { Router } from "express";
import { createSession, verifyAdmin } from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/session", createSession);
authRouter.post("/admin/verify", verifyAdmin);
