import { Router } from "express";
import {
  createShareLink,
  getSharedData,
} from "../controllers/shareController";
import { userAuth } from "../middleware/auth";

export const shareRouter = Router();

// Creating a share link requires a valid user session
shareRouter.post("/", userAuth, createShareLink);

// Resolving a share link is public (the token IS the auth)
shareRouter.get("/:token", getSharedData);
