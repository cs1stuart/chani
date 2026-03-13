import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as messageService from "../services/messageService.js";

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { user1, user2 } = req.params;
    const me = req.user!.id;
    if (me !== user1 && me !== user2) {
      res.status(403).json({ error: "Forbidden: you are not part of this conversation" });
      return;
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const beforeId = (req.query.before as string) || "";
    const result = await messageService.getDirectMessages(user1, user2, me, limit, beforeId || undefined);
    res.json(result);
  } catch (error) {
    console.error("Error fetching messages", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}

export async function getGroupMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const me = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const beforeId = (req.query.before as string) || "";
    const result = await messageService.getGroupMessages(groupId, me, limit, beforeId || undefined);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("Forbidden")) {
      res.status(403).json({ error: msg });
      return;
    }
    console.error("Error fetching group messages:", error);
    res.status(500).json({ error: "Failed to fetch group messages" });
  }
}

export async function getMessageReads(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { messageId } = req.params;
    const me = req.user!.id;
    const reads = await messageService.getMessageReads(messageId, me);
    res.json(reads);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "Message not found") {
      res.status(404).json({ error: msg });
      return;
    }
    if (msg === "Forbidden") {
      res.status(403).json({ error: msg });
      return;
    }
    console.error("Error fetching message reads:", error);
    res.status(500).json({ error: "Failed to fetch read info" });
  }
}

export async function getReactionReactors(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { messageId } = req.params;
    const emoji = (req.query.emoji as string) || "";
    const me = req.user!.id;
    if (!emoji) {
      res.status(400).json({ error: "emoji query is required" });
      return;
    }
    const reactors = await messageService.getReactionReactors(messageId, emoji, me);
    res.json(reactors);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "Message not found") {
      res.status(404).json({ error: msg });
      return;
    }
    if (msg === "Forbidden") {
      res.status(403).json({ error: msg });
      return;
    }
    console.error("Error fetching reaction reactors:", error);
    res.status(500).json({ error: "Failed to fetch reaction info" });
  }
}

