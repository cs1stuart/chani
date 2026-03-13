import mongoose from "mongoose";
import { Message } from "../models/Message.js";
import { toId } from "../utils/helpers.js";
import * as settingsService from "./settingsService.js";

export interface ConversationItem {
  partner_id: string;
  last_message: string | null;
  last_message_time: string | null;
  last_sender_id: string;
  unread_count: number;
}

export async function getConversations(userId: string): Promise<ConversationItem[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const [blockedByMe, blockedMeList] = await Promise.all([
    settingsService.getBlockedIds(userId),
    settingsService.getBlockedByUserIds(userId),
  ]);
  const blockedSet = new Set([...blockedByMe, ...blockedMeList]);

  const messages = await Message.aggregate([
    { $match: { group_id: null, deleted_at: null, $or: [{ creator: uid }, { target: uid }] } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: { $cond: [{ $eq: ["$creator", uid] }, "$target", "$creator"] }, last_message: { $first: "$text" }, last_message_time: { $first: "$createdAt" }, last_sender_id: { $first: "$creator" } } },
  ]);
  const unreadCounts = await Message.aggregate([
    { $match: { target: uid, read_at: null, deleted_at: null, group_id: null } },
    { $group: { _id: "$creator", cnt: { $sum: 1 } } },
  ]);
  const unreadMap: Record<string, number> = {};
  unreadCounts.forEach((r: { _id: unknown; cnt: number }) => { unreadMap[toId(r._id)] = r.cnt; });
  let conversations = messages.map((m: { _id: unknown; last_message: string; last_message_time?: Date; last_sender_id: unknown }) => ({
    partner_id: toId(m._id),
    last_message: m.last_message ?? null,
    last_message_time: m.last_message_time ? new Date(m.last_message_time).toISOString() : null,
    last_sender_id: toId(m.last_sender_id),
    unread_count: unreadMap[toId(m._id)] || 0,
  }));
  conversations = conversations.filter((c) => !blockedSet.has(c.partner_id));
  conversations.sort((a, b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
  return conversations;
}
