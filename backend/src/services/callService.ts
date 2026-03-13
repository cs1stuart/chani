import mongoose from "mongoose";
import { CallLog } from "../models/CallLog.js";
import { GroupCallLog } from "../models/GroupCallLog.js";
import { User } from "../models/User.js";
import { toId, getAvatar } from "../utils/helpers.js";

export interface CallParticipant {
  id: string;
  name: string;
  avatar: string;
}

export interface CallListItem {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string;
  type: "audio" | "video";
  status: "completed" | "missed" | "declined" | "cancelled";
  is_outgoing: boolean;
  duration: number;
  created_at: string;
  group_id?: string;
  group_name?: string;
  group_avatar?: string;
  participants?: CallParticipant[];
}

export async function getCallsForUser(userId: string): Promise<CallListItem[]> {
  const uid = new mongoose.Types.ObjectId(userId);

  const [directCalls, groupCalls] = await Promise.all([
    CallLog.find({ $or: [{ caller_id: uid }, { callee_id: uid }] })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    GroupCallLog.find({ user_id: uid })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
  ]);

  const directItems: CallListItem[] = [];
  if (directCalls.length > 0) {
    const userIds = new Set<string>();
    (directCalls as any[]).forEach((c) => {
      userIds.add(toId(c.caller_id));
      userIds.add(toId(c.callee_id));
    });
    const users = await User.find({ _id: { $in: Array.from(userIds).map((id) => new mongoose.Types.ObjectId(id)) } })
      .lean();
    const userMap = new Map<string, { first_name?: string; last_name?: string; image?: string }>();
    (users as any[]).forEach((u) => userMap.set(toId(u._id), u));

    (directCalls as any[]).forEach((c) => {
      const isOutgoing = String(c.caller_id) === String(uid);
      const otherId = isOutgoing ? toId(c.callee_id) : toId(c.caller_id);
      const other = userMap.get(otherId);
      const name = other ? `${other.first_name || ""} ${other.last_name || ""}`.trim() || "User" : "User";
      const avatar = other ? getAvatar((other as { image?: string }).image || null, (other as { first_name?: string }).first_name || "User") : "";
      directItems.push({
        id: "d-" + toId(c._id),
        other_user_id: otherId,
        other_user_name: name,
        other_user_avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(otherId)}`,
        type: (c.type as "audio" | "video") || "audio",
        status: (c.status as any) || "completed",
        is_outgoing: isOutgoing,
        duration: c.duration || 0,
        created_at: c.createdAt ? new Date(c.createdAt as Date).toISOString() : new Date().toISOString(),
      });
    });
  }

  const groupParticipantIds = new Set<string>();
  (groupCalls as any[]).forEach((c) => {
    if (c.participant_ids && Array.isArray(c.participant_ids)) {
      c.participant_ids.forEach((pid: unknown) => groupParticipantIds.add(toId(pid)));
    }
  });
  const participantUsers =
    groupParticipantIds.size > 0
      ? await User.find({ _id: { $in: Array.from(groupParticipantIds).map((id) => new mongoose.Types.ObjectId(id)) } })
          .lean()
      : [];
  const participantMap = new Map<
    string,
    { first_name?: string; last_name?: string; image?: string }
  >();
  (participantUsers as any[]).forEach((u) =>
    participantMap.set(toId(u._id), {
      first_name: u.first_name,
      last_name: u.last_name,
      image: u.image,
    })
  );

  const groupItems: CallListItem[] = (groupCalls as any[]).map((c) => {
    const groupId = toId(c.group_id);
    const groupName = c.group_name || "Group";
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupName)}`;
    const participants: CallParticipant[] = [];
    if (c.participant_ids && Array.isArray(c.participant_ids)) {
      (c.participant_ids as unknown[]).forEach((pid) => {
        const pidStr = toId(pid);
        const p = participantMap.get(pidStr);
        const name = p
          ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User"
          : "User";
        participants.push({
          id: pidStr,
          name,
          avatar:
            p && p.image
              ? getAvatar(p.image, name)
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(pidStr)}`,
        });
      });
    }
    const namesStr =
      participants.length > 0 ? participants.map((p) => p.name).join(", ") : groupName;
    return {
      id: "g-" + toId(c._id),
      other_user_id: "",
      other_user_name: namesStr,
      other_user_avatar: participants.length > 0 ? participants[0].avatar : avatar,
      type: (c.type as "audio" | "video") || "video",
      status: (c.status as any) || "completed",
      is_outgoing: true,
      duration: c.duration || 0,
      created_at: c.createdAt ? new Date(c.createdAt as Date).toISOString() : new Date().toISOString(),
      group_id: groupId,
      group_name: groupName,
      group_avatar: avatar,
      participants: participants.length > 0 ? participants : undefined,
    };
  });

  const merged = [...directItems, ...groupItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return merged.slice(0, 200);
}

export async function logCall(opts: {
  callerId: string;
  calleeId: string;
  type: "audio" | "video";
  status: "completed" | "missed" | "declined" | "cancelled";
  duration: number;
}): Promise<void> {
  if (!opts.callerId || !opts.calleeId) throw new Error("callerId and calleeId required");
  if (!mongoose.Types.ObjectId.isValid(opts.callerId) || !mongoose.Types.ObjectId.isValid(opts.calleeId)) {
    throw new Error("Invalid caller or callee ID");
  }
  const caller = new mongoose.Types.ObjectId(opts.callerId);
  const callee = new mongoose.Types.ObjectId(opts.calleeId);
  await CallLog.create({
    caller_id: caller,
    callee_id: callee,
    type: opts.type || "audio",
    status: opts.status || "completed",
    duration: Math.max(0, Math.round(Number(opts.duration) || 0)),
  });
}

export async function logGroupCall(opts: {
  participantIds: string[];
  groupId: string;
  groupName: string;
  type: "audio" | "video";
  status: "completed" | "missed" | "declined" | "cancelled";
  duration: number;
}): Promise<void> {
  if (!opts.groupId || !opts.participantIds?.length) throw new Error("groupId and participantIds required");
  if (!mongoose.Types.ObjectId.isValid(opts.groupId)) throw new Error("Invalid group ID");
  const groupIdObj = new mongoose.Types.ObjectId(opts.groupId);
  const participantIdsObj = opts.participantIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  for (const uid of participantIdsObj) {
    await GroupCallLog.create({
      user_id: uid,
      group_id: groupIdObj,
      group_name: opts.groupName || "Group",
      participant_ids: participantIdsObj,
      type: opts.type || "video",
      status: opts.status || "completed",
      duration: Math.max(0, Math.round(Number(opts.duration) || 0)),
    });
  }
}

