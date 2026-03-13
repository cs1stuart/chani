import mongoose from "mongoose";
import { MessageGroup } from "../models/MessageGroup.js";
import { MessageGroupMember } from "../models/MessageGroupMember.js";
import { Message } from "../models/Message.js";
import { MessageRead } from "../models/MessageRead.js";
import { User } from "../models/User.js";
import { getAvatar, toId, sanitize } from "../utils/helpers.js";

export interface GroupListItem {
  id: string;
  name: string;
  avatar: string;
  created_by: string;
  created_at: string;
  last_message?: string | null;
  last_message_time?: string | null;
  last_sender_id?: string | null;
  last_sender_name?: string | null;
  unread_count?: number;
}

export interface GroupMemberItem {
  id: string;
  username: string;
  avatar: string;
  status: string;
  last_seen: Date | null;
  role: string;
}

export async function getGroupsByUserId(userId: string): Promise<GroupListItem[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const memberships = await MessageGroupMember.find({ user_id: uid }).lean();
  const groupIds = memberships.map((m: { group_id: unknown }) => m.group_id);

  // Exclude call-only groups (add-to-1:1) and legacy "Group Call" - they shouldn't appear in chat list
  const groups = await MessageGroup.find({
    _id: { $in: groupIds },
    for_call_only: { $ne: true },
    name: { $ne: "Group Call" },
  }).lean();
  const result: GroupListItem[] = [];

  for (const g of groups) {
    const gObj = g as { _id: unknown; name: string; created_by: unknown; createdAt?: Date };
    const lastMsg = await Message.findOne({ group_id: g._id, deleted_at: null })
      .sort({ createdAt: -1 })
      .populate("creator", "first_name last_name")
      .lean();
    const unreadCount = await Message.countDocuments({
      group_id: g._id,
      deleted_at: null,
      creator: { $ne: uid },
      _id: { $nin: await MessageRead.find({ user_id: uid }).distinct("message_id") },
    });
    const lastMsgObj = lastMsg as { text?: string; createdAt?: Date; creator?: { _id?: unknown; first_name?: string; last_name?: string } } | null;
    result.push({
      id: toId(gObj._id),
      name: gObj.name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(gObj.name)}`,
      created_by: toId(gObj.created_by),
      created_at: gObj.createdAt ? new Date(gObj.createdAt).toISOString() : new Date().toISOString(),
      last_message: lastMsgObj?.text ?? null,
      last_message_time: lastMsgObj?.createdAt ? new Date(lastMsgObj.createdAt).toISOString() : null,
      last_sender_id: lastMsgObj?.creator ? toId(lastMsgObj.creator._id ?? lastMsgObj.creator) : null,
      last_sender_name: lastMsgObj?.creator
        ? `${lastMsgObj.creator.first_name || ""} ${lastMsgObj.creator.last_name || ""}`.trim()
        : null,
      unread_count: unreadCount || 0,
    });
  }
  result.sort(
    (a, b) =>
      (new Date(b.last_message_time || 0) as unknown as number) - (new Date(a.last_message_time || 0) as unknown as number)
  );
  return result;
}

export async function getGroupMembers(groupId: string, me: string): Promise<GroupMemberItem[]> {
  const gid = new mongoose.Types.ObjectId(groupId);
  const member = await MessageGroupMember.findOne({ group_id: gid, user_id: me });
  if (!member) throw new Error("Forbidden");

  const members = await MessageGroupMember.find({ group_id: gid })
    .populate("user_id", "first_name last_name image is_online chat_status last_login")
    .sort({ role: 1 })
    .lean();

  return members.map((m: Record<string, unknown>) => {
    const uid = m.user_id as { _id?: unknown; first_name?: string; last_name?: string; image?: string; is_online?: number; chat_status?: string; last_login?: Date };
    return {
      id: toId(uid?._id ?? m.user_id),
      username: uid ? `${uid.first_name || ""} ${uid.last_name || ""}`.trim() : "",
      avatar: getAvatar(uid?.image || null, uid?.first_name || "User"),
      status: uid?.is_online || uid?.chat_status === "online" ? "online" : "offline",
      last_seen: uid?.last_login ? new Date(uid.last_login) : null,
      role: (m.role as string) || "member",
    };
  });
}

export async function createGroup(name: string, members: string[], createdBy: string): Promise<GroupListItem> {
  const cleanName = sanitize(name);
  if (!cleanName || cleanName.length > 50) throw new Error("Group name is required (max 50 characters)");

  const createdByObj = new mongoose.Types.ObjectId(createdBy);
  const group = await MessageGroup.create({ name: cleanName, created_by: createdByObj });

  const allMembers = [...new Set([...members, String(createdBy)])];
  for (const userId of allMembers) {
    await MessageGroupMember.create({
      group_id: group._id,
      user_id: userId,
      role: String(userId) === String(createdBy) ? "admin" : "member",
    });
  }

  return {
    id: toId(group._id),
    name: cleanName,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
    created_by: String(createdBy),
    created_at: new Date().toISOString(),
  };
}

export async function addGroupMembers(groupId: string, me: string, memberIds: string[]): Promise<{ added: string[] }> {
  const gid = new mongoose.Types.ObjectId(groupId);
  const adminCheck = await MessageGroupMember.findOne({ group_id: gid, user_id: me });
  if (!adminCheck) throw new Error("You are not a member of this group");

  const existing = await MessageGroupMember.find({ group_id: gid }).distinct("user_id");
  const existingIds = new Set(existing.map((id: unknown) => toId(id)));
  const added: string[] = [];

  for (const userId of memberIds) {
    if (existingIds.has(String(userId))) continue;
    await MessageGroupMember.create({ group_id: gid, user_id: userId, role: "member" });
    added.push(String(userId));
    existingIds.add(String(userId));
  }
  return { added };
}

export async function leaveGroup(groupId: string, me: string): Promise<void> {
  const gid = new mongoose.Types.ObjectId(groupId);
  const member = await MessageGroupMember.findOne({ group_id: gid, user_id: me });
  if (!member) throw new Error("You are not a member of this group");
  await MessageGroupMember.deleteOne({ group_id: gid, user_id: me });
}

export async function deleteGroup(groupId: string, me: string): Promise<void> {
  const gid = new mongoose.Types.ObjectId(groupId);
  const adminCheck = await MessageGroupMember.findOne({ group_id: gid, user_id: me });
  if (!adminCheck || adminCheck.role !== "admin") throw new Error("Only admin can delete the group");
  await MessageGroupMember.deleteMany({ group_id: gid });
  await Message.updateMany({ group_id: gid }, { $set: { deleted_at: new Date() } });
  await MessageGroup.deleteOne({ _id: gid });
}
