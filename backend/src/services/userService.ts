import mongoose from "mongoose";
import { User } from "../models/User.js";
import { getAvatar, toId, sanitize } from "../utils/helpers.js";
import * as settingsService from "./settingsService.js";
import { getConversations } from "./conversationService.js";

export interface UserListItem {
  id: string;
  username: string;
  avatar: string;
  about: string;
  status: "online" | "offline";
  last_seen: Date | null;
}

const PLACEHOLDER_ABOUT = "";

function canShowToViewer(
  visibility: "everyone" | "contacts" | "nobody",
  viewerId: string,
  targetId: string,
  contactPartnerIds: Set<string>
): boolean {
  if (visibility === "everyone") return true;
  if (visibility === "nobody") return false;
  if (visibility === "contacts") return contactPartnerIds.has(targetId);
  return false;
}

export async function getAllUsers(): Promise<UserListItem[]> {
  const users = await User.find({ status: "active" }).lean();
  return users.map((u: Record<string, unknown>) => ({
    id: toId(u._id),
    username: `${u.first_name || ""} ${u.last_name || ""}`.trim() || (u.email as string),
    avatar: getAvatar((u.image as string) || null, (u.first_name as string) || "User"),
    about: (u.about as string) || "Hey there! I am using WorkChat.",
    status: (u.is_online || u.chat_status === "online") ? "online" : "offline",
    last_seen: u.last_login ? new Date(u.last_login as Date) : null,
  }));
}

export async function getUsersForViewer(viewerId: string): Promise<UserListItem[]> {
  const [blockedByMe, blockedMeSet, conversations] = await Promise.all([
    settingsService.getBlockedIds(viewerId),
    settingsService.getBlockedByUserIds(viewerId).then((ids) => new Set(ids)),
    getConversations(viewerId),
  ]);
  const blockedSet = new Set([...blockedByMe, ...blockedMeSet]);
  const contactPartnerIds = new Set(conversations.map((c) => c.partner_id));

  const users = await User.find({ status: "active" }).lean();
  const filtered = users.filter((u: Record<string, unknown>) => !blockedSet.has(toId(u._id)));
  const userIds = filtered.map((u: Record<string, unknown>) => toId(u._id));
  const privacyMap = await settingsService.getPrivacyForUserIds(userIds);

  return filtered.map((u: Record<string, unknown>) => {
    const id = toId(u._id);
    const privacy = privacyMap.get(id) || { last_seen: "everyone", profile_photo: "everyone", about: "everyone" };
    const lastSeen = (privacy.last_seen ?? "everyone") as "everyone" | "contacts" | "nobody";
    const profilePhoto = (privacy.profile_photo ?? "everyone") as "everyone" | "contacts" | "nobody";
    const about = (privacy.about ?? "everyone") as "everyone" | "contacts" | "nobody";
    const showLastSeen = canShowToViewer(lastSeen, viewerId, id, contactPartnerIds);
    const showPhoto = canShowToViewer(profilePhoto, viewerId, id, contactPartnerIds);
    const showAbout = canShowToViewer(about, viewerId, id, contactPartnerIds);

    return {
      id,
      username: `${u.first_name || ""} ${u.last_name || ""}`.trim() || (u.email as string),
      avatar: showPhoto ? getAvatar((u.image as string) || null, (u.first_name as string) || "User") : getAvatar(null, "User"),
      about: showAbout ? ((u.about as string) || "Hey there! I am using WorkChat.") : PLACEHOLDER_ABOUT,
      status: (u.is_online || u.chat_status === "online") ? "online" : "offline",
      last_seen: showLastSeen && u.last_login ? new Date(u.last_login as Date) : null,
    };
  });
}

export async function updateProfile(
  userId: string,
  data: { username: string; avatar: string; about: string }
): Promise<void> {
  const cleanName = sanitize(data.username);
  if (!cleanName || cleanName.length > 100) throw new Error("Invalid username");
  const nameParts = cleanName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  await User.updateOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    {
      $set: {
        first_name: firstName,
        last_name: lastName,
        image: data.avatar,
        about: (data.about || "").slice(0, 255),
        updatedAt: new Date(),
      },
    }
  );
}
