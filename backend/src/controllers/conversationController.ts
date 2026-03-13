import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as conversationService from "../services/conversationService.js";

export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    if (req.user!.id !== String(userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const conversations = await conversationService.getConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
}
