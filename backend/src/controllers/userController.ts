import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as userService from "../services/userService.js";

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const viewerId = req.user!.id;
    const users = await userService.getUsersForViewer(viewerId);
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id, username, avatar, about } = req.body;
    if (req.user!.id !== String(id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await userService.updateProfile(id, { username, avatar, about });
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update profile";
    if (msg === "Invalid username") {
      res.status(400).json({ error: msg });
      return;
    }
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
}
