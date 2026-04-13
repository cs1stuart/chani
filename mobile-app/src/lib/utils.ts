export const formatMessagePreview = (msg: {
  type: string;
  content?: string;
  file_name?: string;
}): string => {
  if (msg.type === "image") return "Photo";
  if (msg.type === "file") return msg.file_name || "Document";
  if (msg.type === "call") return "Call";
  if (msg.type === "audio") return "Voice message";
  if (msg.type === "video") return "Video";
  return (msg.content || "").slice(0, 100);
};

export function mediaUrl(path: string | undefined, base: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
