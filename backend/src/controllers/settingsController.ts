import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as settingsService from "../services/settingsService.js";

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const settings = await settingsService.getSettings(userId);
    res.json(settings);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { section, data } = req.body as { section: string; data: Record<string, unknown> };
    if (!section || !data || typeof data !== "object") {
      res.status(400).json({ error: "section and data required" });
      return;
    }
    const allowed = ["privacy", "security", "chats", "notifications", "storage"];
    if (!allowed.includes(section)) {
      res.status(400).json({ error: "Invalid section" });
      return;
    }
    const settings = await settingsService.updateSettings(userId, section, data);
    res.json(settings);
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
}

export async function setLastBackup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    await settingsService.setLastBackup(userId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error setting backup time:", err);
    res.status(500).json({ error: "Failed to update backup time" });
  }
}

export async function getBlocked(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const blockedIds = await settingsService.getBlockedIds(userId);
    res.json(blockedIds);
  } catch (err) {
    console.error("Error fetching blocked:", err);
    res.status(500).json({ error: "Failed to fetch blocked contacts" });
  }
}

export async function addBlocked(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { userId: blockedId } = req.body as { userId: string };
    if (!blockedId) {
      res.status(400).json({ error: "userId required" });
      return;
    }
    await settingsService.addBlocked(userId, blockedId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ error: "Failed to block user" });
  }
}

export async function removeBlocked(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const blockedId = (req.params as { userId: string }).userId;
    if (!blockedId) {
      res.status(400).json({ error: "userId required" });
      return;
    }
    await settingsService.removeBlocked(userId, blockedId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error unblocking user:", err);
    res.status(500).json({ error: "Failed to unblock user" });
  }
}
