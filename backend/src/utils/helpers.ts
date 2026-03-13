export const getAvatar = (image: string | null, name: string): string =>
  image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

export const sanitize = (text: string): string => text.trim().replace(/<[^>]*>/g, "");

export const MAX_MESSAGE_LENGTH = 5000;

export const toId = (v: unknown): string => (v && typeof v === "object" && "toString" in v ? (v as { toString: () => string }).toString() : String(v));
