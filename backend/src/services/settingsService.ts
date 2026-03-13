import mongoose from "mongoose";
import { UserSettings } from "../models/UserSettings.js";
import { toId } from "../utils/helpers.js";

const defaultSettings = {
  privacy: {
    last_seen: "everyone",
    profile_photo: "everyone",
    about: "everyone",
    read_receipts: true,
    blocked_ids: [],
    live_location: false,
  },
  security: {
    two_step_enabled: false,
    two_step_pin: undefined,
  },
  chats: {
    last_backup_at: null,
    enter_to_send: false,
    media_visibility: true,
    wallpaper: "default",
    wallpaper_color: null,
  },
  notifications: {
    messages_enabled: true,
    message_tone: "default",
    message_vibrate: true,
    message_popup: true,
    group_enabled: true,
    group_tone: "default",
    group_vibrate: true,
    call_ringtone: "default",
    call_vibrate: true,
  },
  storage: {
    auto_download_photos: true,
    auto_download_videos: false,
    auto_download_documents: false,
  },
};

export async function getSettings(userId: string): Promise<Record<string, unknown>> {
  const doc = await UserSettings.findOne({ user_id: new mongoose.Types.ObjectId(userId) }).lean();
  if (!doc) {
    const created = await UserSettings.create({
      user_id: new mongoose.Types.ObjectId(userId),
      ...defaultSettings,
    });
    const out = created.toObject() as unknown as Record<string, unknown>;
    serializeBlockedIds(out);
    return out;
  }
  const obj = doc as Record<string, unknown>;
  const merged = { ...defaultSettings } as Record<string, unknown>;
  if (obj.privacy && typeof obj.privacy === "object")
    merged.privacy = { ...(defaultSettings as any).privacy, ...(obj.privacy as object) };
  if (obj.security && typeof obj.security === "object")
    merged.security = { ...(defaultSettings as any).security, ...(obj.security as object) };
  if (obj.chats && typeof obj.chats === "object")
    merged.chats = { ...(defaultSettings as any).chats, ...(obj.chats as object) };
  if (obj.notifications && typeof obj.notifications === "object")
    merged.notifications = { ...(defaultSettings as any).notifications, ...(obj.notifications as object) };
  if (obj.storage && typeof obj.storage === "object")
    merged.storage = { ...(defaultSettings as any).storage, ...(obj.storage as object) };
  serializeBlockedIds(merged);
  return merged;
}

function serializeBlockedIds(merged: Record<string, unknown>): void {
  const pr = merged.privacy as Record<string, unknown>;
  if (pr && Array.isArray(pr.blocked_ids))
    pr.blocked_ids = pr.blocked_ids.map((id: unknown) => (id && typeof (id as any).toString === "function") ? (id as any).toString() : String(id));
}

function toDotSet(section: string, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) out[`${section}.${k}`] = v;
  return out;
}

export async function updateSettings(
  userId: string,
  section: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const uid = new mongoose.Types.ObjectId(userId);
  let payload = data;
  if (section === "privacy" && payload && typeof payload === "object") {
    const { blocked_ids: _, ...rest } = payload as Record<string, unknown>;
    payload = rest;
  }
  const setObj = toDotSet(section, payload);
  await UserSettings.findOneAndUpdate(
    { user_id: uid },
    { $set: setObj },
    { upsert: true, new: true }
  );
  return getSettings(userId);
}

export async function setLastBackup(userId: string): Promise<void> {
  const uid = new mongoose.Types.ObjectId(userId);
  await UserSettings.findOneAndUpdate(
    { user_id: uid },
    { $set: { "chats.last_backup_at": new Date() } },
    { upsert: true }
  );
}

export async function addBlocked(userId: string, blockedId: string): Promise<void> {
  const uid = new mongoose.Types.ObjectId(userId);
  const bid = new mongoose.Types.ObjectId(blockedId);
  await UserSettings.findOneAndUpdate(
    { user_id: uid },
    { $addToSet: { "privacy.blocked_ids": bid } },
    { upsert: true }
  );
}

export async function removeBlocked(userId: string, blockedId: string): Promise<void> {
  const uid = new mongoose.Types.ObjectId(userId);
  const bid = new mongoose.Types.ObjectId(blockedId);
  await UserSettings.findOneAndUpdate(
    { user_id: uid },
    { $pull: { "privacy.blocked_ids": bid } },
    { upsert: true }
  );
}

export async function getBlockedIds(userId: string): Promise<string[]> {
  const doc = await UserSettings.findOne(
    { user_id: new mongoose.Types.ObjectId(userId) },
    { "privacy.blocked_ids": 1 }
  ).lean();
  const ids = (doc as any)?.privacy?.blocked_ids || [];
  return ids.map((id: unknown) => toId(id));
}

/** Returns user IDs who have blocked the given userId (so we can hide them from this user's list). */
export async function getBlockedByUserIds(userId: string): Promise<string[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const docs = await UserSettings.find(
    { "privacy.blocked_ids": uid },
    { user_id: 1 }
  ).lean();
  return docs.map((d: Record<string, unknown>) => toId((d as any).user_id));
}

/** Get privacy section for many users (for applying visibility when listing users). */
export async function getPrivacyForUserIds(userIds: string[]): Promise<Map<string, { last_seen?: string; profile_photo?: string; about?: string }>> {
  if (userIds.length === 0) return new Map();
  const ids = userIds.map((id) => new mongoose.Types.ObjectId(id));
  const docs = await UserSettings.find(
    { user_id: { $in: ids } },
    { user_id: 1, "privacy.last_seen": 1, "privacy.profile_photo": 1, "privacy.about": 1 }
  ).lean();
  const map = new Map<string, { last_seen?: string; profile_photo?: string; about?: string }>();
  for (const d of docs as any[]) {
    const uid = toId(d.user_id);
    map.set(uid, {
      last_seen: d.privacy?.last_seen ?? "everyone",
      profile_photo: d.privacy?.profile_photo ?? "everyone",
      about: d.privacy?.about ?? "everyone",
    });
  }
  return map;
}
