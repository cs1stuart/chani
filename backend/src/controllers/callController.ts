import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as callService from "../services/callService.js";

export async function getCalls(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    if (req.user!.id !== String(userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const calls = await callService.getCallsForUser(userId);
    res.json(calls);
  } catch (err) {
    console.error("Error fetching calls:", err);
    res.status(500).json({ error: "Failed to fetch calls" });
  }
}

export async function logCall(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const callerId = body?.callerId != null ? String(body.callerId) : "";
    const calleeId = body?.calleeId != null ? String(body.calleeId) : "";
    const type = (body?.type === "video" ? "video" : "audio") as "audio" | "video";
    const status = ["completed", "missed", "declined", "cancelled"].includes(String(body?.status))
      ? (body.status as "completed" | "missed" | "declined" | "cancelled")
      : "completed";
    const duration = Number(body?.duration) || 0;
    const uid = req.user!.id;
    if (uid !== callerId && uid !== calleeId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await callService.logCall({ callerId, calleeId, type, status, duration });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Error logging call:", err);
    res.status(500).json({ error: "Failed to log call" });
  }
}

export async function logGroupCall(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const groupId = body?.groupId != null ? String(body.groupId) : "";
    const groupName = body?.groupName != null ? String(body.groupName) : "Group";
    const type = (body?.type === "video" ? "video" : "audio") as "audio" | "video";
    const status = ["completed", "missed", "declined", "cancelled"].includes(String(body?.status))
      ? (body.status as "completed" | "missed" | "declined" | "cancelled")
      : "completed";
    const duration = Number(body?.duration) || 0;
    const uid = req.user!.id;
    const rawParticipants = body?.participantIds;
    const participantIds = Array.isArray(rawParticipants)
      ? rawParticipants.map((id) => String(id)).filter(Boolean)
      : [uid];
    if (!participantIds.includes(uid)) participantIds.push(uid);
    await callService.logGroupCall({ participantIds, groupId, groupName, type, status, duration });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Error logging group call:", err);
    res.status(500).json({ error: "Failed to log group call" });
  }
}

