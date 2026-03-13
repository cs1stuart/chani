import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Message } from "../models/Message.js";
import { MessageGroupMember } from "../models/MessageGroupMember.js";
import { MessageRead } from "../models/MessageRead.js";
import { MessageDeletion } from "../models/MessageDeletion.js";
import { MessageReaction } from "../models/MessageReaction.js";
import { User } from "../models/User.js";
import { toId, sanitize, MAX_MESSAGE_LENGTH, getAvatar } from "../utils/helpers.js";
import { getJwtSecret } from "../middlewares/auth.js";
import * as settingsService from "../services/settingsService.js";

const socketRateLimits = new Map<string, { count: number; resetAt: number }>();
function checkSocketRate(userId: string, max = 30): boolean {
  const now = Date.now();
  const entry = socketRateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    socketRateLimits.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of socketRateLimits) {
    if (now > val.resetAt) socketRateLimits.delete(key);
  }
}, 300000);

const activeGroupCalls = new Map<string, { type: "audio" | "video"; participants: Set<string> }>();

export function setupSocket(io: Server): void {
  const JWT_SECRET = getJwtSecret();
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  const connectedUsers = new Map<string, string>();
  const userRoom = (id: string | number) => `user:${id}`;
  const groupRoom = (id: string | number) => `group:${id}`;

  io.on("connection", (socket) => {
    const authenticatedUser = socket.data.user as { id: string; email: string };
    console.log(`User connected: ${socket.id} (userId: ${authenticatedUser.id})`);

    socket.on("join", async (userId: string) => {
      if (String(userId) !== String(authenticatedUser.id)) {
        socket.emit("error", { message: "Cannot join as another user" });
        return;
      }
      connectedUsers.set(socket.id, userId);
      socket.join(userRoom(userId));
      try {
        const groups = await MessageGroupMember.find({ user_id: userId }).distinct("group_id");
        groups.forEach((gid: unknown) => socket.join(groupRoom(toId(gid))));
        await User.updateOne({ _id: userId }, { $set: { chat_status: "online", is_online: 1, updatedAt: new Date() } });
      } catch (err) {
        console.error("Error in join:", err);
      }
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("join_group", async (groupId: string) => {
      const check = await MessageGroupMember.findOne({ group_id: groupId, user_id: authenticatedUser.id });
      if (check) socket.join(groupRoom(groupId));
    });

    socket.on(
      "send_message",
      async (data: { senderId: string; receiverId?: string; groupId?: string; content: string; type?: string; fileName?: string }) => {
        if (String(data.senderId) !== String(authenticatedUser.id)) {
          socket.emit("error", { message: "Cannot send messages as another user" });
          return;
        }
        if (!checkSocketRate(authenticatedUser.id)) {
          socket.emit("error", { message: "Too many messages, slow down" });
          return;
        }
        const isFileMessage = data.type === "image" || data.type === "file" || data.type === "video";
        const content = isFileMessage ? (data.content || "").trim() : sanitize(data.content || "");
        if (!content) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }
        if (!isFileMessage && content.length > MAX_MESSAGE_LENGTH) {
          socket.emit("error", { message: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` });
          return;
        }
        try {
          if (data.receiverId) {
            const [myBlocked, theyBlockedMe] = await Promise.all([
              settingsService.getBlockedIds(data.senderId),
              settingsService.getBlockedByUserIds(data.receiverId),
            ]);
            if (myBlocked.includes(data.receiverId) || theyBlockedMe.includes(data.senderId)) {
              socket.emit("error", { message: "You cannot message this user" });
              return;
            }
          }
          const { senderId, receiverId, groupId, type = "text", fileName } = data;
          const creatorId = new mongoose.Types.ObjectId(senderId);
          const targetId = receiverId ? new mongoose.Types.ObjectId(receiverId) : undefined;
          const groupIdObj = groupId ? new mongoose.Types.ObjectId(groupId) : undefined;
          const msg = await Message.create({
            unique_id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            timestamp: Math.floor(Date.now() / 1000),
            creator: creatorId,
            target: targetId,
            group_id: groupIdObj,
            text: content,
            type,
            file_name: fileName || null,
          });
          let senderName: string | null = null;
          let totalMembers = 0;
          if (groupId) {
            const u = await User.findById(senderId).lean();
            senderName = u ? `${(u as { first_name?: string; last_name?: string }).first_name || ""} ${(u as { first_name?: string; last_name?: string }).last_name || ""}`.trim() : null;
            totalMembers = await MessageGroupMember.countDocuments({ group_id: groupId });
          }
          const message: Record<string, unknown> = {
            id: toId(msg._id),
            sender_id: senderId,
            receiver_id: receiverId || null,
            group_id: groupId || null,
            content,
            type,
            file_name: fileName || null,
            timestamp: new Date().toISOString(),
            read_at: null,
            sender_name: senderName,
          };
          if (groupId) {
            message.read_count = 0;
            message.total_members = totalMembers;
          }
          if (groupId) io.to(groupRoom(groupId)).emit("new_message", message);
          else if (receiverId) {
            io.to(userRoom(senderId)).emit("new_message", message);
            io.to(userRoom(receiverId)).emit("new_message", message);
          }
        } catch (err) {
          console.error("Error sending message:", err);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    socket.on("mark_read", async (data: { readerId: string; senderId: string }) => {
      if (String(data.readerId) !== String(authenticatedUser.id)) return;
      try {
        const senderSettings = await settingsService.getSettings(data.senderId);
        const readReceipts = (senderSettings.privacy as Record<string, unknown>)?.read_receipts;
        if (readReceipts === false) return;
        const result = await Message.updateMany(
          { creator: data.senderId, target: data.readerId, read_at: null, deleted_at: null },
          { $set: { read_at: new Date(), updatedAt: new Date() } }
        );
        if (result.modifiedCount > 0) io.to(userRoom(data.senderId)).emit("messages_read", { readBy: data.readerId, senderId: data.senderId });
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    });

    socket.on("mark_group_read", async (data: { groupId: string; userId: string }) => {
      if (String(data.userId) !== String(authenticatedUser.id)) return;
      try {
        const gid = new mongoose.Types.ObjectId(data.groupId);
        const uid = new mongoose.Types.ObjectId(data.userId);
        const unreadMsgs = await Message.find({
          group_id: gid,
          creator: { $ne: uid },
          deleted_at: null,
          _id: { $nin: await MessageRead.find({ user_id: uid }).distinct("message_id") },
        }).lean();
        if (unreadMsgs.length === 0) return;
        for (const m of unreadMsgs) {
          await MessageRead.findOneAndUpdate({ message_id: m._id, user_id: uid }, { $set: { read_at: new Date() } }, { upsert: true });
        }
        const msgIds = unreadMsgs.map((m: { _id: unknown }) => m._id);
        const readCounts = await MessageRead.aggregate([{ $match: { message_id: { $in: msgIds } } }, { $group: { _id: "$message_id", cnt: { $sum: 1 } } }]);
        const countsMap: Record<string, number> = {};
        readCounts.forEach((r: { _id: unknown; cnt: number }) => { countsMap[toId(r._id)] = r.cnt; });
        const totalMembers = await MessageGroupMember.countDocuments({ group_id: gid });
        io.to(groupRoom(data.groupId)).emit("group_read_update", { groupId: data.groupId, userId: data.userId, reads: countsMap, totalMembers });
      } catch (err) {
        console.error("Error marking group messages as read:", err);
      }
    });

    socket.on("create_group", (data: { id: string; name: string; avatar: string; created_by: string; created_at: string; members: string[] }) => {
      socket.join(groupRoom(data.id));
      const groupPayload = { id: data.id, name: data.name, avatar: data.avatar, created_by: data.created_by, created_at: data.created_at };
      const allMembers = [...new Set([data.created_by, ...(data.members || [])])];
      allMembers.forEach((userId) => {
        io.to(userRoom(userId)).emit("join_new_group", { groupId: data.id });
        io.to(userRoom(userId)).emit("group_created", groupPayload);
      });
    });

    socket.on("add_group_members", (data: { groupId: string; members: string[]; group: Record<string, unknown> }) => {
      data.members.forEach((userId) => {
        io.to(userRoom(userId)).emit("join_new_group", { groupId: data.groupId });
        io.to(userRoom(userId)).emit("group_created", data.group);
      });
      io.to(groupRoom(data.groupId)).emit("group_members_updated", { groupId: data.groupId });
    });

    socket.on("leave_group", async (data: { groupId: string; userId: string }) => {
      if (String(data.userId) !== String(authenticatedUser.id)) return;
      socket.leave(groupRoom(data.groupId));
      io.to(groupRoom(data.groupId)).emit("group_member_left", { groupId: data.groupId, userId: data.userId });
      io.to(groupRoom(data.groupId)).emit("group_members_updated", { groupId: data.groupId });

      try {
        const user = await User.findById(data.userId).lean();
        if (user) {
          const u = user as { first_name?: string; last_name?: string; email?: string };
          const name = `${u.first_name || ""} ${u.last_name || ""}`.trim() || (u.email ?? "Someone");

          const gid = new mongoose.Types.ObjectId(data.groupId);
          const creatorId = new mongoose.Types.ObjectId(data.userId);
          const msg = await Message.create({
            unique_id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            timestamp: Math.floor(Date.now() / 1000),
            creator: creatorId,
            target: null,
            group_id: gid,
            text: `${name} left the group`,
            type: "text",
            file_name: null,
          });

          const totalMembers = await MessageGroupMember.countDocuments({ group_id: gid });
          const message: Record<string, unknown> = {
            id: toId(msg._id),
            sender_id: data.userId,
            receiver_id: null,
            group_id: data.groupId,
            content: `${name} left the group`,
            type: "text",
            file_name: null,
            timestamp: new Date().toISOString(),
            read_at: null,
            sender_name: name,
            read_count: 0,
            total_members: totalMembers,
          };

          io.to(groupRoom(data.groupId)).emit("new_message", message);
        }
      } catch (err) {
        console.error("Error broadcasting leave activity:", err);
      }
    });

    socket.on("kick_member", async (data: { groupId: string; memberId: string }) => {
      try {
        const gid = new mongoose.Types.ObjectId(data.groupId);
        const admin = await MessageGroupMember.findOne({ group_id: gid, user_id: authenticatedUser.id }).lean();
        if (!admin || (admin as { role?: string }).role !== "admin") {
          socket.emit("error", { message: "Only admins can remove group members" });
          return;
        }

        const member = await MessageGroupMember.findOne({ group_id: gid, user_id: data.memberId }).lean();
        if (!member) {
          socket.emit("error", { message: "User is not a member of this group" });
          return;
        }

        await MessageGroupMember.deleteOne({ group_id: gid, user_id: data.memberId });

        io.to(groupRoom(data.groupId)).emit("group_member_left", { groupId: data.groupId, userId: data.memberId });
        io.to(groupRoom(data.groupId)).emit("group_members_updated", { groupId: data.groupId });

        const [removedUser, adminUser] = await Promise.all([
          User.findById(data.memberId).lean(),
          User.findById(authenticatedUser.id).lean(),
        ]);

        if (removedUser && adminUser) {
          const ru = removedUser as { first_name?: string; last_name?: string; email?: string };
          const au = adminUser as { first_name?: string; last_name?: string; email?: string };
          const removedName = `${ru.first_name || ""} ${ru.last_name || ""}`.trim() || (ru.email ?? "Someone");
          const adminName = `${au.first_name || ""} ${au.last_name || ""}`.trim() || (au.email ?? "Admin");

          const gid = new mongoose.Types.ObjectId(data.groupId);
          const adminId = new mongoose.Types.ObjectId(authenticatedUser.id);
          const msg = await Message.create({
            unique_id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            timestamp: Math.floor(Date.now() / 1000),
            creator: adminId,
            target: null,
            group_id: gid,
            text: `${removedName} was removed by ${adminName}`,
            type: "text",
            file_name: null,
          });

          const totalMembers = await MessageGroupMember.countDocuments({ group_id: gid });
          const message: Record<string, unknown> = {
            id: toId(msg._id),
            sender_id: authenticatedUser.id,
            receiver_id: null,
            group_id: data.groupId,
            content: `${removedName} was removed by ${adminName}`,
            type: "text",
            file_name: null,
            timestamp: new Date().toISOString(),
            read_at: null,
            sender_name: adminName,
            read_count: 0,
            total_members: totalMembers,
          };

          io.to(groupRoom(data.groupId)).emit("new_message", message);
        }
      } catch (err) {
        console.error("Error kicking group member:", err);
        socket.emit("error", { message: "Failed to remove member from group" });
      }
    });

    socket.on("delete_group", (data: { groupId: string }) => {
      io.to(groupRoom(data.groupId)).emit("group_deleted", { groupId: data.groupId });
    });

    socket.on("call_user", async (data: { to: string; from: string; signal: unknown; type: "audio" | "video" }) => {
      if (String(data.from) !== String(authenticatedUser.id)) return;
      try {
        const caller = await User.findById(authenticatedUser.id).lean();
        const u = caller as { first_name?: string; last_name?: string; email?: string } | null;
        const fromName = u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() || (u.email ?? "Unknown") : "Unknown";
        io.to(userRoom(data.to)).emit("incoming_call", { from: data.from, fromName, signal: data.signal, type: data.type });
      } catch {
        io.to(userRoom(data.to)).emit("incoming_call", { from: data.from, fromName: "Unknown", signal: data.signal, type: data.type });
      }
    });
    socket.on("call_received", (data: { to: string }) => io.to(userRoom(data.to)).emit("call_ringing"));
    socket.on("answer_call", (data: { to: string; signal: unknown }) => io.to(userRoom(data.to)).emit("call_accepted", data.signal));
    socket.on("reject_call", (data: { to: string }) => io.to(userRoom(data.to)).emit("call_rejected"));
    socket.on("end_call", (data: { to: string }) => io.to(userRoom(data.to)).emit("call_ended"));

    socket.on("start_group_call", async (data: { groupId: string; type: "audio" | "video"; groupName: string }) => {
      try {
        const members = await MessageGroupMember.find({ group_id: data.groupId }).distinct("user_id");
        const memberIds = members.map((m: unknown) => toId(m)).filter((id: string) => id !== authenticatedUser.id);
        activeGroupCalls.set(data.groupId, { type: data.type, participants: new Set([authenticatedUser.id]) });
        memberIds.forEach((userId: string) => {
          io.to(userRoom(userId)).emit("incoming_group_call", {
            groupId: data.groupId,
            from: authenticatedUser.id,
            type: data.type,
            groupName: data.groupName || "Group",
          });
        });
      } catch (err) {
        console.error("start_group_call error:", err);
      }
    });

    socket.on("join_group_call", async (data: { groupId: string }) => {
      try {
        const room = activeGroupCalls.get(data.groupId);
        if (!room) return;
        const participants = Array.from(room.participants);
        room.participants.add(authenticatedUser.id);
        socket.emit("group_call_participants", { groupId: data.groupId, participants, type: room.type });
        participants.forEach((pId: string) => {
          io.to(userRoom(pId)).emit("group_call_participant_joined", {
            groupId: data.groupId,
            userId: authenticatedUser.id,
            type: room.type,
          });
        });
      } catch (err) {
        console.error("join_group_call error:", err);
      }
    });

    socket.on("group_call_signal", (data: { groupId: string; to: string; signal: unknown }) => {
      io.to(userRoom(data.to)).emit("group_call_signal", {
        from: authenticatedUser.id,
        signal: data.signal,
      });
    });

    socket.on("leave_group_call", (data: { groupId: string }) => {
      const room = activeGroupCalls.get(data.groupId);
      if (room) {
        room.participants.delete(authenticatedUser.id);
        if (room.participants.size === 0) activeGroupCalls.delete(data.groupId);
        else {
          room.participants.forEach((pId: string) => {
            io.to(userRoom(pId)).emit("group_call_participant_left", { groupId: data.groupId, userId: authenticatedUser.id });
          });
        }
      }
    });

    socket.on("end_group_call", (data: { groupId: string }) => {
      const room = activeGroupCalls.get(data.groupId);
      if (room) {
        const participants = Array.from(room.participants);
        activeGroupCalls.delete(data.groupId);
        participants.forEach((pId: string) => {
          io.to(userRoom(pId)).emit("group_call_ended", { groupId: data.groupId });
        });
      }
    });

    socket.on("group_call_video_off", (data: { groupId: string }) => {
      const room = activeGroupCalls.get(data.groupId);
      if (room) {
        room.participants.forEach((pId: string) => {
          if (pId !== authenticatedUser.id) {
            io.to(userRoom(pId)).emit("group_call_participant_video_off", { userId: authenticatedUser.id });
          }
        });
      }
    });

    socket.on("group_call_video_on", (data: { groupId: string }) => {
      const room = activeGroupCalls.get(data.groupId);
      if (room) {
        room.participants.forEach((pId: string) => {
          if (pId !== authenticatedUser.id) {
            io.to(userRoom(pId)).emit("group_call_participant_video_on", { userId: authenticatedUser.id });
          }
        });
      }
    });

    socket.on("invite_to_group_call", async (data: { groupId: string; userId: string }) => {
      try {
        const groupIdStr = String(data.groupId || "").trim();
        const userIdStr = String(data.userId || "").trim();
        if (!groupIdStr || !userIdStr) {
          socket.emit("invite_to_group_call_failed", { reason: "Invalid request" });
          return;
        }

        const room = activeGroupCalls.get(groupIdStr);
        const inviterId = String(authenticatedUser.id);
        if (!room || !room.participants.has(inviterId)) {
          socket.emit("invite_to_group_call_failed", { reason: "Call session not found" });
          return;
        }
        if (room.participants.has(userIdStr)) {
          socket.emit("invite_to_group_call_failed", { reason: "User is already in the call" });
          return;
        }

        const groupIdObj = new mongoose.Types.ObjectId(groupIdStr);
        const userIdObj = new mongoose.Types.ObjectId(userIdStr);
        let member = await MessageGroupMember.findOne({ group_id: groupIdObj, user_id: userIdObj });
        // If user is not in group, add them (allows any participant to invite anyone to the call)
        if (!member) {
          await MessageGroupMember.create({
            group_id: groupIdObj,
            user_id: userIdObj,
            role: "member",
          });
        }

        const group = await (await import("../models/MessageGroup.js")).MessageGroup.findById(groupIdStr).lean();
        const groupName = group && typeof (group as { name?: string }).name === "string" ? (group as { name: string }).name : "Group";

        io.to(userRoom(userIdStr)).emit("incoming_group_call", {
          groupId: groupIdStr,
          from: inviterId,
          type: room.type,
          groupName,
        });
        socket.emit("invite_to_group_call_sent", { userId: userIdStr });
      } catch (err) {
        console.error("invite_to_group_call error:", err);
        socket.emit("invite_to_group_call_failed", { reason: "Could not send invitation" });
      }
    });

    socket.on("add_to_1_1_call", async (data: { otherParticipantId: string; addUserId?: string; addUserIds?: string[]; type: "audio" | "video" }) => {
      try {
        const otherId = String(data.otherParticipantId || "").trim();
        const addIds = Array.isArray(data.addUserIds) && data.addUserIds.length > 0
          ? data.addUserIds.map((id) => String(id).trim()).filter((id) => id && id !== otherId)
          : data.addUserId
            ? [String(data.addUserId).trim()].filter((id) => id && id !== otherId)
            : [];
        if (!otherId || addIds.length === 0) return;
        const me = String(authenticatedUser.id);
        const { MessageGroup } = await import("../models/MessageGroup.js");
        const allIds = [me, otherId, ...addIds];
        const uniqueIds = [...new Set(allIds)];
        if (uniqueIds.length < 3) return;
        const group = await MessageGroup.create({
          name: "Group Call",
          created_by: new mongoose.Types.ObjectId(me),
          for_call_only: true, // Don't show in chat list - only for call
        });
        const groupIdStr = toId(group._id);
        for (const uid of uniqueIds) {
          await MessageGroupMember.create({
            group_id: group._id,
            user_id: uid,
            role: uid === me ? "admin" : "member",
          });
        }
        activeGroupCalls.set(groupIdStr, { type: data.type || "audio", participants: new Set([me]) });
        // Prepare: both set flag so peer "close" won't trigger leaveCall
        io.to(userRoom(otherId)).emit("call_upgrading_to_group");
        socket.emit("call_upgrading_to_group");
        // Stagger switch: other (Ali) destroys first. When Umair destroys later, Ali's peer is already gone.
        setTimeout(() => {
          io.to(userRoom(otherId)).emit("switch_to_group_call", { groupId: groupIdStr, groupName: "Group Call", type: data.type || "audio", isGroupCallInitiator: false });
          setTimeout(() => {
            socket.emit("switch_to_group_call", { groupId: groupIdStr, groupName: "Group Call", type: data.type || "audio", isGroupCallInitiator: true });
          }, 80);
        }, 200);
        for (const addId of addIds) {
          io.to(userRoom(addId)).emit("incoming_group_call", { groupId: groupIdStr, from: me, type: data.type || "audio", groupName: "Group Call" });
        }
      } catch (err) {
        console.error("add_to_1_1_call error:", err);
        socket.emit("add_to_call_failed", { reason: "Could not add participant" });
      }
    });

    socket.on("ice_candidate", (data: { to: string; candidate: unknown }) => io.to(userRoom(data.to)).emit("ice_candidate", data.candidate));
    socket.on("update_profile", async (data: { id: string }) => {
      if (String(data.id) !== String(authenticatedUser.id)) return;
      try {
        const user = await User.findById(data.id).lean();
        if (!user) return;
        const u = user as Record<string, unknown>;
        const payload = {
          id: toId(u._id),
          username: `${u.first_name || ""} ${u.last_name || ""}`.trim() || (u.email as string),
          avatar: getAvatar((u.image as string) || null, ((u.first_name as string) || "User")),
          about: (u.about as string) || "Hey there! I am using WorkChat.",
          status: (u.is_online || u.chat_status === "online") ? "online" as const : "offline" as const,
          last_seen: u.last_login || null,
        };
        io.emit("user_updated", payload);
      } catch (err) {
        console.error("Error broadcasting profile update:", err);
      }
    });

    socket.on("edit_message", async (data: { messageId: string; content: string }) => {
      const { messageId, content } = data;
      try {
        const msg = await Message.findById(messageId).lean();
        if (!msg) {
          socket.emit("error", { message: "Message not found" });
          return;
        }
        const m = msg as { creator: unknown; group_id?: unknown; target?: unknown; type?: string };
        const creatorId = toId(m.creator);
        if (creatorId !== String(authenticatedUser.id)) {
          socket.emit("error", { message: "Only the sender can edit this message" });
          return;
        }
        if (m.type && m.type !== "text") {
          socket.emit("error", { message: "Only text messages can be edited" });
          return;
        }
        const sanitized = sanitize(content || "");
        if (!sanitized) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }
        if (sanitized.length > MAX_MESSAGE_LENGTH) {
          socket.emit("error", { message: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` });
          return;
        }
        const groupId = m.group_id ? toId(m.group_id) : null;
        const targetId = m.target ? toId(m.target) : null;
        await Message.updateOne(
          { _id: messageId },
          { $set: { text: sanitized, edited_at: new Date(), updatedAt: new Date() } }
        );
        const payload = { id: messageId, content: sanitized, edited_at: new Date().toISOString() };
        if (groupId) io.to(groupRoom(groupId)).emit("message_edited", payload);
        else {
          io.to(userRoom(creatorId)).emit("message_edited", payload);
          if (targetId) io.to(userRoom(targetId)).emit("message_edited", payload);
        }
      } catch (err) {
        console.error("Error editing message:", err);
        socket.emit("error", { message: "Failed to edit message" });
      }
    });

    socket.on("add_reaction", async (data: { messageId: string; emoji: string }) => {
      const { messageId, emoji } = data;
      const allowed = ["👍", "❤️", "😂", "😊"];
      if (!allowed.includes(emoji)) {
        socket.emit("error", { message: "Invalid reaction" });
        return;
      }
      try {
        const msg = await Message.findById(messageId).lean();
        if (!msg) {
          socket.emit("error", { message: "Message not found" });
          return;
        }
        const m = msg as { group_id?: unknown; target?: unknown };
        const groupId = m.group_id ? toId(m.group_id) : null;
        const targetId = m.target ? toId(m.target) : null;
        const creatorId = toId((msg as { creator: unknown }).creator);
        const mid = new mongoose.Types.ObjectId(messageId);
        const uid = new mongoose.Types.ObjectId(authenticatedUser.id);
        await MessageReaction.findOneAndUpdate(
          { message_id: mid, user_id: uid },
          { $set: { emoji } },
          { upsert: true }
        );
        const payload = { messageId, userId: authenticatedUser.id, emoji };
        if (groupId) io.to(groupRoom(groupId)).emit("reaction_added", payload);
        else {
          io.to(userRoom(creatorId)).emit("reaction_added", payload);
          if (targetId) io.to(userRoom(targetId)).emit("reaction_added", payload);
        }
      } catch (err) {
        console.error("Error adding reaction:", err);
        socket.emit("error", { message: "Failed to add reaction" });
      }
    });

    socket.on("remove_reaction", async (data: { messageId: string }) => {
      const { messageId } = data;
      try {
        const msg = await Message.findById(messageId).lean();
        if (!msg) {
          socket.emit("error", { message: "Message not found" });
          return;
        }
        const m = msg as { group_id?: unknown; target?: unknown };
        const groupId = m.group_id ? toId(m.group_id) : null;
        const targetId = m.target ? toId(m.target) : null;
        const creatorId = toId((msg as { creator: unknown }).creator);
        const mid = new mongoose.Types.ObjectId(messageId);
        const uid = new mongoose.Types.ObjectId(authenticatedUser.id);
        await MessageReaction.deleteOne({ message_id: mid, user_id: uid });
        const payload = { messageId, userId: authenticatedUser.id };
        if (groupId) io.to(groupRoom(groupId)).emit("reaction_removed", payload);
        else {
          io.to(userRoom(creatorId)).emit("reaction_removed", payload);
          if (targetId) io.to(userRoom(targetId)).emit("reaction_removed", payload);
        }
      } catch (err) {
        console.error("Error removing reaction:", err);
        socket.emit("error", { message: "Failed to remove reaction" });
      }
    });

    socket.on("delete_message", async (data: { messageId: string; mode: "everyone" | "me" }) => {
      const { messageId, mode } = data;
      try {
        const msg = await Message.findById(messageId).lean();
        if (!msg) {
          socket.emit("error", { message: "Message not found" });
          return;
        }
        const m = msg as { creator: unknown; group_id?: unknown; target?: unknown };
        const creatorId = toId(m.creator);
        const groupId = m.group_id ? toId(m.group_id) : null;
        const targetId = m.target ? toId(m.target) : null;
        if (mode === "everyone") {
          if (creatorId !== String(authenticatedUser.id)) {
            socket.emit("error", { message: "Only the sender can delete for everyone" });
            return;
          }
          await Message.updateOne({ _id: messageId }, { $set: { deleted_at: new Date() } });
          if (groupId) io.to(groupRoom(groupId)).emit("message_deleted", messageId);
          else {
            io.to(userRoom(creatorId)).emit("message_deleted", messageId);
            if (targetId) io.to(userRoom(targetId)).emit("message_deleted", messageId);
          }
        } else {
          await MessageDeletion.findOneAndUpdate({ message_id: messageId, user_id: authenticatedUser.id }, { $set: { deleted_at: new Date() } }, { upsert: true });
          socket.emit("message_deleted", messageId);
        }
      } catch (err) {
        console.error("Error deleting message:", err);
      }
    });

    socket.on("disconnect", async () => {
      const userId = connectedUsers.get(socket.id);
      if (userId) {
        connectedUsers.delete(socket.id);
        try {
          await User.updateOne({ _id: userId }, { $set: { chat_status: "offline", is_online: 0, last_login: new Date(), updatedAt: new Date() } });
        } catch (err) {
          console.error("Error updating user status:", err);
        }
        io.emit("user_status", { userId, status: "offline" });
      }
      console.log("User disconnected:", socket.id);
    });
  });
}
