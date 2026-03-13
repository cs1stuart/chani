import { User } from "@/types";

const getDateParts = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateLabel = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const today = getDateParts(now);
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = getDateParts(date);

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";

  const oneWeekAgo = new Date(today.getTime() - 6 * 86400000);
  if (msgDate.getTime() >= oneWeekAgo.getTime()) {
    return date.toLocaleDateString([], { weekday: "long" });
  }

  const thisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    ...(thisYear ? {} : { year: "numeric" }),
  });
};

export const formatChatTime = (isoString: string | null) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const today = getDateParts(now);
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = getDateParts(date);

  if (msgDate.getTime() === today.getTime()) {
    return formatTime(isoString);
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const formatLastSeen = (user: User) => {
  if (user.status === "online") return "online";
  if (!user.last_seen) return "offline";
  const date = new Date(user.last_seen);
  const now = new Date();
  const today = getDateParts(now);
  const yesterday = new Date(today.getTime() - 86400000);
  const seenDate = getDateParts(date);
  const time = formatTime(user.last_seen);

  if (seenDate.getTime() === today.getTime()) return `last seen today at ${time}`;
  if (seenDate.getTime() === yesterday.getTime()) return `last seen yesterday at ${time}`;
  const dateStr = date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
  return `last seen ${dateStr} at ${time}`;
};

export const formatCallTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/** Formats call message JSON to human-readable string for reply previews */
export const formatCallPreview = (content: string): string => {
  try {
    const data = JSON.parse(content);
    const isVoice = data.t === "audio";
    const type = isVoice ? "Voice call" : "Video call";
    const status = data.k || "completed";
    const direction = data.d || "outgoing";
    const dur = data.dur || 0;
    let subtitle = "";
    if (status === "completed") {
      subtitle = dur >= 60 ? `${Math.floor(dur / 60)} min` : `${Math.max(1, dur)} secs`;
    } else if (status === "declined") subtitle = "Declined";
    else if (status === "missed") subtitle = direction === "incoming" ? "Missed call" : "No answer";
    else if (status === "cancelled") subtitle = direction === "outgoing" ? "No answer" : "Cancelled";
    return subtitle ? `${type} · ${subtitle}` : type;
  } catch {
    return "Call";
  }
};

/** Formats message content for reply preview based on type */
export const formatMessagePreview = (msg: { type: string; content?: string; file_name?: string }): string => {
  if (msg.type === "image") return "📷 Photo";
  if (msg.type === "file") return `📄 ${msg.file_name || "Document"}`;
  if (msg.type === "call") return formatCallPreview(msg.content || "{}");
  if (msg.type === "audio") return "🎤 Voice message";
  if (msg.type === "video") return "🎬 Video";
  return (msg.content || "").slice(0, 100);
};

export const parseReply = (
  content: string
): { reply: { name: string; text: string; type: string; img?: string } | null; text: string } => {
  const match = content.match(/^\[RPL:([A-Za-z0-9+/=]+)\]([\s\S]*)$/);
  if (!match) return { reply: null, text: content };
  try {
    const decoded = decodeURIComponent(escape(atob(match[1])));
    const data = JSON.parse(decoded);
    return { reply: { name: data.n, text: data.t, type: data.tp || "text", img: data.img }, text: match[2] };
  } catch {
    return { reply: null, text: content };
  }
};

export type LastMessageIconType = "video-call" | "audio-call" | "photo" | "video" | "voice" | "document" | "text";

/** Returns label + icon type for sidebar last message preview */
export const getLastMessagePreviewWithIcon = (
  content: string | null | undefined
): { label: string; iconType: LastMessageIconType } => {
  if (!content || typeof content !== "string") return { label: "", iconType: "text" };
  const trimmed = content.trim();
  if (!trimmed) return { label: "", iconType: "text" };

  // Call message: JSON like {"t":"video","k":"cancelled",...} or {"t":"audio",...}
  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed);
      if (data?.t === "video") return { label: "Video Call", iconType: "video-call" };
      if (data?.t === "audio") return { label: "Audio Call", iconType: "audio-call" };
    } catch {
      // not valid call JSON, fall through
    }
  }

  // Image: /uploads/... with .png, .jpg, etc.
  if (/\/uploads\/[^\s]+\.(png|jpg|jpeg|gif|webp|bmp)(\?|$)/i.test(trimmed)) return { label: "Photo", iconType: "photo" };

  // Video: /uploads/... with .mp4, .webm, etc.
  if (/\/uploads\/[^\s]+\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(trimmed)) return { label: "Video", iconType: "video" };

  // Voice/audio message
  if (/\/uploads\/[^\s]+\.(ogg|opus|m4a|mp3|wav)(\?|$)/i.test(trimmed)) return { label: "Voice message", iconType: "voice" };

  // Other uploads (documents)
  if (trimmed.startsWith("/uploads/")) return { label: "Document", iconType: "document" };

  // Normal text or reply
  const { text } = parseReply(trimmed);
  return { label: text || trimmed, iconType: "text" };
};

/** Formats raw last_message content for sidebar preview (Photo, Video, Video Call, Audio Call, etc.) */
export const formatLastMessagePreview = (content: string | null | undefined): string => {
  return getLastMessagePreviewWithIcon(content).label;
};
