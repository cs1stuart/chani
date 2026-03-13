import mongoose from "mongoose";
import { Message } from "../models/Message.js";
import { MessageGroupMember } from "../models/MessageGroupMember.js";
import { MessageRead } from "../models/MessageRead.js";
import { MessageDeletion } from "../models/MessageDeletion.js";
import { MessageReaction } from "../models/MessageReaction.js";
import { getAvatar, toId } from "../utils/helpers.js";

export interface ReactionItem {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface MessageListItem {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string;
  type: string;
  file_name: string | null;
  timestamp: string;
  read_at: string | null;
  edited_at?: string | null;
  sender_name?: string | null;
  read_count?: number;
  total_members?: number;
  reactions?: ReactionItem[];
}

export interface GetMessagesResult {
  messages: MessageListItem[];
  hasMore: boolean;
}

export async function getDirectMessages(user1: string, user2: string, me: string, limit: number, beforeId?: string): Promise<GetMessagesResult> {
  const u1 = new mongoose.Types.ObjectId(user1);
  const u2 = new mongoose.Types.ObjectId(user2);
  const meObj = new mongoose.Types.ObjectId(me);
  const query: Record<string, unknown> = { $or: [{ creator: u1, target: u2 }, { creator: u2, target: u1 }], group_id: null, deleted_at: null };
  const deletedByMe = await MessageDeletion.find({ user_id: meObj }).distinct("message_id");
  if (deletedByMe.length) (query as Record<string, unknown>)._id = { $nin: deletedByMe };
  if (beforeId && mongoose.Types.ObjectId.isValid(beforeId)) {
    const beforeMsg = await Message.findById(beforeId);
    if (beforeMsg) query.createdAt = { $lt: beforeMsg.createdAt };
  }
  const list = await Message.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  list.reverse();
  const msgIds = list.map((m: Record<string, unknown>) => m._id);
  const reactionsAgg = await MessageReaction.aggregate([
    { $match: { message_id: { $in: msgIds } } },
    { $group: { _id: { message_id: "$message_id", emoji: "$emoji" }, userIds: { $push: "$user_id" } } },
    { $project: { message_id: "$_id.message_id", emoji: "$_id.emoji", count: { $size: "$userIds" }, userIds: 1 } },
  ]);
  const reactionsMap: Record<string, ReactionItem[]> = {};
  reactionsAgg.forEach((r: { message_id: unknown; emoji: string; count: number; userIds: unknown[] }) => {
    const mid = toId(r.message_id);
    if (!reactionsMap[mid]) reactionsMap[mid] = [];
    reactionsMap[mid].push({ emoji: r.emoji, count: r.count, userIds: r.userIds.map((u: unknown) => toId(u)) });
  });
  const messages: MessageListItem[] = list.map((m: Record<string, unknown>) => ({
    id: toId(m._id),
    sender_id: toId(m.creator),
    receiver_id: m.target ? toId(m.target) : null,
    group_id: m.group_id ? toId(m.group_id) : null,
    content: m.text as string,
    type: (m.type as string) || "text",
    file_name: (m.file_name as string) || null,
    timestamp: m.createdAt ? new Date(m.createdAt as Date).toISOString() : new Date().toISOString(),
    read_at: m.read_at ? new Date(m.read_at as Date).toISOString() : null,
    edited_at: m.edited_at ? new Date(m.edited_at as Date).toISOString() : null,
    reactions: reactionsMap[toId(m._id)] || [],
  }));
  return { messages, hasMore: messages.length === limit };
}

export async function getGroupMessages(groupId: string, me: string, limit: number, beforeId?: string): Promise<GetMessagesResult> {
  const gid = new mongoose.Types.ObjectId(groupId);
  const meObj = new mongoose.Types.ObjectId(me);
  const membership = await MessageGroupMember.findOne({ group_id: gid, user_id: meObj }).lean();
  if (!membership) {
    throw new Error("Forbidden: you are not a member of this group");
  }

  const joinAt = (membership as { createdAt?: Date }).createdAt || null;
  const totalMembers = await MessageGroupMember.countDocuments({ group_id: gid });
  const deletedByMe = await MessageDeletion.find({ user_id: meObj }).distinct("message_id");
  const query: Record<string, unknown> = { group_id: gid, deleted_at: null };
  if (deletedByMe.length) (query as Record<string, unknown>)._id = { $nin: deletedByMe };
  const createdCond: Record<string, unknown> = {};
  if (joinAt) createdCond.$gte = joinAt;
  if (beforeId && mongoose.Types.ObjectId.isValid(beforeId)) {
    const beforeDoc = await Message.findById(beforeId);
    if (beforeDoc) createdCond.$lt = beforeDoc.createdAt;
  }
  if (Object.keys(createdCond).length) {
    query.createdAt = createdCond;
  }
  const list = await Message.find(query).sort({ createdAt: -1 }).limit(limit).populate("creator", "first_name last_name").lean();
  const msgIds = list.map((m: Record<string, unknown>) => m._id);
  const [readCounts, reactionsAgg] = await Promise.all([
    MessageRead.aggregate([{ $match: { message_id: { $in: msgIds } } }, { $group: { _id: "$message_id", cnt: { $sum: 1 } } }]),
    MessageReaction.aggregate([
      { $match: { message_id: { $in: msgIds } } },
      { $group: { _id: { message_id: "$message_id", emoji: "$emoji" }, userIds: { $push: "$user_id" } } },
      { $project: { message_id: "$_id.message_id", emoji: "$_id.emoji", count: { $size: "$userIds" }, userIds: 1 } },
    ]),
  ]);
  const readMap: Record<string, number> = {};
  readCounts.forEach((r: { _id: unknown; cnt: number }) => { readMap[toId(r._id)] = r.cnt; });
  const reactionsMap: Record<string, ReactionItem[]> = {};
  reactionsAgg.forEach((r: { message_id: unknown; emoji: string; count: number; userIds: unknown[] }) => {
    const mid = toId(r.message_id);
    if (!reactionsMap[mid]) reactionsMap[mid] = [];
    reactionsMap[mid].push({ emoji: r.emoji, count: r.count, userIds: r.userIds.map((u: unknown) => toId(u)) });
  });
  const messages: MessageListItem[] = list.reverse().map((m: Record<string, unknown>) => {
    const creator = m.creator as { _id?: unknown; first_name?: string; last_name?: string } | undefined;
    return {
      id: toId(m._id),
      sender_id: toId(creator?._id ?? m.creator),
      receiver_id: m.target ? toId(m.target) : null,
      group_id: toId(m.group_id),
      content: m.text as string,
      type: (m.type as string) || "text",
      file_name: (m.file_name as string) || null,
      timestamp: m.createdAt ? new Date(m.createdAt as Date).toISOString() : new Date().toISOString(),
      read_at: m.read_at ? new Date(m.read_at as Date).toISOString() : null,
      edited_at: m.edited_at ? new Date(m.edited_at as Date).toISOString() : null,
      sender_name: creator ? `${creator.first_name || ""} ${creator.last_name || ""}`.trim() : null,
      read_count: readMap[toId(m._id)] || 0,
      total_members: totalMembers,
      reactions: reactionsMap[toId(m._id)] || [],
    };
  });
  return { messages, hasMore: messages.length === limit };
}

export async function getReactionReactors(messageId: string, emoji: string, me: string): Promise<{ user_id: string; username: string; avatar: string }[]> {
  const mid = new mongoose.Types.ObjectId(messageId);
  const msg = await Message.findById(mid).lean();
  if (!msg) throw new Error("Message not found");
  const m = msg as { group_id?: unknown; creator?: unknown; target?: unknown };
  if (m.group_id) {
    const member = await MessageGroupMember.findOne({ group_id: m.group_id, user_id: new mongoose.Types.ObjectId(me) });
    if (!member) throw new Error("Forbidden");
  } else {
    const creatorId = toId(m.creator);
    const targetId = m.target ? toId(m.target) : null;
    if (creatorId !== me && targetId !== me) throw new Error("Forbidden");
  }
  const reactions = await MessageReaction.find({ message_id: mid, emoji }).populate("user_id", "first_name last_name image").lean();
  return reactions.map((r: Record<string, unknown>) => {
    const uid = r.user_id as { _id?: unknown; first_name?: string; last_name?: string; image?: string };
    return { user_id: toId(uid?._id ?? r.user_id), username: uid ? `${uid.first_name || ""} ${uid.last_name || ""}`.trim() : "", avatar: getAvatar(uid?.image || null, uid?.first_name || "User") };
  });
}

export async function getMessageReads(messageId: string, me: string): Promise<{ user_id: string; username: string; avatar: string; read_at: string }[]> {
  const mid = new mongoose.Types.ObjectId(messageId);
  const msg = await Message.findById(mid).lean();
  if (!msg) throw new Error("Message not found");
  const m = msg as { group_id?: unknown; creator?: unknown };
  if (m.group_id) {
    const member = await MessageGroupMember.findOne({ group_id: m.group_id, user_id: me });
    if (!member) throw new Error("Forbidden");
  } else if (toId(m.creator) !== me) throw new Error("Forbidden");
  const reads = await MessageRead.find({ message_id: mid }).populate("user_id", "first_name last_name image").lean();
  return reads.map((r: Record<string, unknown>) => {
    const uid = r.user_id as { _id?: unknown; first_name?: string; last_name?: string; image?: string };
    return { user_id: toId(uid?._id ?? r.user_id), username: uid ? `${uid.first_name || ""} ${uid.last_name || ""}`.trim() : "", avatar: getAvatar(uid?.image || null, uid?.first_name || "User"), read_at: new Date(r.read_at as Date).toISOString() };
  });
}
