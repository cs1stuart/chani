import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as groupService from "../services/groupService.js";

export async function getGroups(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    if (req.user!.id !== String(userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const groups = await groupService.getGroupsByUserId(userId);
    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
}

export async function getGroupMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const me = req.user!.id;
    const members = await groupService.getGroupMembers(groupId, me);
    res.json(members);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "Forbidden") {
      res.status(403).json({ error: msg });
      return;
    }
    console.error("Error fetching group members:", error);
    res.status(500).json({ error: "Failed to fetch group members" });
  }
}

export async function createGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, members, createdBy } = req.body;
    if (req.user!.id !== String(createdBy)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const group = await groupService.createGroup(name, members, createdBy);
    res.json(group);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("Group name")) {
      res.status(400).json({ error: msg });
      return;
    }
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
}

export async function addGroupMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const { members } = req.body;
    const me = req.user!.id;
    if (!Array.isArray(members) || members.length === 0) {
      res.status(400).json({ error: "No members provided" });
      return;
    }
    const result = await groupService.addGroupMembers(groupId, me, members);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("not a member")) {
      res.status(403).json({ error: msg });
      return;
    }
    console.error("Error adding group members:", error);
    res.status(500).json({ error: "Failed to add members" });
  }
}

export async function leaveGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const me = req.user!.id;
    await groupService.leaveGroup(groupId, me);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("not a member")) {
      res.status(403).json({ error: msg });
      return;
    }
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Failed to exit group" });
  }
}

export async function deleteGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { groupId } = req.params;
    const me = req.user!.id;
    await groupService.deleteGroup(groupId, me);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("Only admin")) {
      res.status(403).json({ error: msg });
      return;
    }
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
}
