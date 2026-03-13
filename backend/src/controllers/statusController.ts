import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as statusService from "../services/statusService.js";

export async function createStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { mediaUrl, text, mediaType, bgColor, fontStyle } = req.body as {
      mediaUrl: string; text: string; mediaType?: string; bgColor?: string; fontStyle?: string;
    };
    const userId = req.user!.id;
    if (!mediaUrl && !text) {
      res.status(400).json({ error: "Status must have media or text" });
      return;
    }
    await statusService.createStatus(userId, mediaUrl, text || "", mediaType, bgColor, fontStyle);
    const io = (req as any).app?.get?.("io");
    if (io) io.emit("status_created");
    res.json({ success: true });
  } catch (err) {
    console.error("Error creating status:", err);
    res.status(500).json({ error: "Failed to create status" });
  }
}

export async function getStatuses(req: AuthRequest, res: Response): Promise<void> {
  try {
    const _userId = req.user!.id;
    const statuses = await statusService.getStatusesForUser(_userId);
    res.json(statuses);
  } catch (err) {
    console.error("Error fetching statuses:", err);
    res.status(500).json({ error: "Failed to fetch statuses" });
  }
}

export async function recordView(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { statusId } = req.params as { statusId: string };
    const viewerId = req.user!.id;
    if (!statusId) {
      res.status(400).json({ error: "Status ID required" });
      return;
    }
    await statusService.recordStatusView(statusId, viewerId);
    res.json({ success: true });
  } catch (err) {
    console.error("Error recording status view:", err);
    res.status(500).json({ error: "Failed to record view" });
  }
}

export async function deleteStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { statusId } = req.params as { statusId: string };
    const userId = req.user!.id;
    if (!statusId) {
      res.status(400).json({ error: "Status ID required" });
      return;
    }
    const deleted = await statusService.deleteStatus(statusId, userId);
    if (!deleted) {
      res.status(404).json({ error: "Status not found or you cannot delete it" });
      return;
    }
    const io = (req as any).app?.get?.("io");
    if (io) io.emit("status_created");
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting status:", err);
    res.status(500).json({ error: "Failed to delete status" });
  }
}

