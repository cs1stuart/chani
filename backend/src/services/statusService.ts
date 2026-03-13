import mongoose from "mongoose";
import { Status } from "../models/Status.js";
import { User } from "../models/User.js";
import { Message } from "../models/Message.js";
import { getAvatar, toId } from "../utils/helpers.js";

/** User ids with whom current user has had a 1:1 chat (no group). Only direct messages. */
async function getChatPartnerIds(userId: string): Promise<Set<string>> {
  if (!userId || typeof userId !== "string") return new Set();
  const uid = new mongoose.Types.ObjectId(userId);
  const currentIdStr = String(userId).trim();
  const docs = await Message.find(
    {
      group_id: null,
      deleted_at: null,
      creator: { $exists: true, $ne: null },
      target: { $exists: true, $ne: null },
      $or: [{ creator: uid }, { target: uid }],
    },
    { creator: 1, target: 1 }
  )
    .lean();
  const partnerIds = new Set<string>();
  (docs as { creator: unknown; target: unknown }[]).forEach((d) => {
    const c = d.creator ? toId(d.creator) : "";
    const t = d.target ? toId(d.target) : "";
    if (c && c !== currentIdStr) partnerIds.add(c);
    if (t && t !== currentIdStr) partnerIds.add(t);
  });
  return partnerIds;
}

export interface StatusViewer {
  user_id: string;
  username: string;
  avatar: string;
  viewed_at: string;
}

export interface StatusItem {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
  media_url: string;
  media_type: "image" | "video" | "";
  text: string;
  bg_color: string;
  font_style: string;
  created_at: string;
  view_count: number;
  viewers: StatusViewer[];
  viewed_by_me: boolean;
}

export async function createStatus(
  userId: string,
  mediaUrl: string,
  text: string,
  mediaType?: string,
  bgColor?: string,
  fontStyle?: string
): Promise<void> {
  const uid = new mongoose.Types.ObjectId(userId);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  let mType: "image" | "video" | "" = "";
  if (mediaType === "video") mType = "video";
  else if (mediaType === "image") mType = "image";
  else if (mediaUrl && /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(mediaUrl)) mType = "video";
  else if (mediaUrl && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(mediaUrl)) mType = "image";
  await Status.create({
    user_id: uid,
    media_url: mediaUrl,
    media_type: mType,
    text: (text || "").slice(0, 255),
    bg_color: bgColor || "",
    font_style: fontStyle || "",
    expires_at: expires,
  });
}

export async function deleteStatus(statusId: string, userId: string): Promise<boolean> {
  const sid = new mongoose.Types.ObjectId(statusId);
  const uid = new mongoose.Types.ObjectId(userId);
  const deleted = await Status.findOneAndDelete({ _id: sid, user_id: uid });
  return !!deleted;
}

export async function recordStatusView(statusId: string, viewerUserId: string): Promise<boolean> {
  const sid = new mongoose.Types.ObjectId(statusId);
  const vid = new mongoose.Types.ObjectId(viewerUserId);
  const status = await Status.findOne({ _id: sid, expires_at: { $gt: new Date() } }).lean();
  if (!status) return false;
  const ownerId = toId((status as any).user_id);
  if (ownerId === viewerUserId) return true; // viewing own status, no view to record
  const views = (status as any).views || [];
  if (views.some((v: any) => toId(v.viewer_id) === viewerUserId)) return true; // already viewed
  await Status.updateOne(
    { _id: sid },
    { $push: { views: { viewer_id: vid, viewed_at: new Date() } } }
  );
  return true;
}

export async function getStatusesForUser(userId: string): Promise<StatusItem[]> {
  const now = new Date();
  const chatPartnerIds = await getChatPartnerIds(userId);
  // Only statuses from self or from users with whom current user has chatted
  const allowedUserIds = new Set<string>([userId, ...chatPartnerIds]);
  const statuses = await Status.find({
    expires_at: { $gt: now },
    user_id: { $in: Array.from(allowedUserIds).map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!statuses.length) return [];

  const userIds = Array.from(new Set((statuses as any[]).map((s) => toId(s.user_id))));
  const allViewerIds = new Set<string>();
  (statuses as any[]).forEach((s) => {
    const views = s.views || [];
    views.forEach((v: any) => allViewerIds.add(toId(v.viewer_id)));
  });
  const idsToFetch = Array.from(new Set([...userIds, ...allViewerIds]));
  const users = await User.find({ _id: { $in: idsToFetch.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
  const userMap = new Map<string, { first_name?: string; last_name?: string; image?: string }>();
  (users as any[]).forEach((u) => userMap.set(toId(u._id), u));

  return (statuses as any[]).map((s) => {
    const uid = toId(s.user_id);
    const u = userMap.get(uid);
    const username =
      `${u?.first_name || ""} ${u?.last_name || ""}`.trim() || "User";
    const avatar = getAvatar((u?.image as string) || null, u?.first_name || "User");
    const views = (s.views || []) as { viewer_id: any; viewed_at: Date }[];
    const viewersRaw = views
      .sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())
      .map((v) => {
        const vid = toId(v.viewer_id);
        const vu = userMap.get(vid);
        const vname =
          `${vu?.first_name || ""} ${vu?.last_name || ""}`.trim() || "User";
        const vavatar = getAvatar((vu?.image as string) || null, vu?.first_name || "User");
        return {
          user_id: vid,
          username: vname,
          avatar: vavatar,
          viewed_at: v.viewed_at ? new Date(v.viewed_at).toISOString() : new Date().toISOString(),
        };
      });
    // One entry per viewer (most recent view)
    const seen = new Set<string>();
    const viewers: StatusViewer[] = viewersRaw.filter((v) => {
      if (seen.has(v.user_id)) return false;
      seen.add(v.user_id);
      return true;
    });
    const viewedByMe = viewers.some((v) => v.user_id === userId);
    return {
      id: toId(s._id),
      user_id: uid,
      username,
      avatar,
      media_url: (s.media_url as string) || "",
      media_type: (s.media_type as "image" | "video" | "") || "",
      text: (s.text as string) || "",
      bg_color: (s.bg_color as string) || "",
      font_style: (s.font_style as string) || "",
      created_at: s.createdAt ? new Date(s.createdAt as Date).toISOString() : new Date().toISOString(),
      view_count: viewers.length,
      viewers,
      viewed_by_me: viewedByMe,
    };
  });
}

