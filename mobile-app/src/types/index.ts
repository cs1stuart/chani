export type UserRole = "admin" | "employee";

export interface User {
  id: string;
  username: string;
  avatar: string;
  about?: string;
  status?: "online" | "offline";
  last_seen?: string;
  role?: UserRole;
}

export interface Group {
  id: string;
  name: string;
  avatar: string;
  created_by: string;
  created_at: string;
}

export interface Message {
  id: number | string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  content: string;
  type: "text" | "image" | "video" | "file" | "call" | "audio";
  file_name?: string;
  timestamp: string;
  read_at?: string | null;
  edited_at?: string | null;
  sender_name?: string;
  read_count?: number;
  total_members?: number;
}

export interface CallLogItem {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string;
  type: "audio" | "video";
  status: string;
  is_outgoing: boolean;
  duration: number;
  created_at: string;
  group_id?: string;
  group_name?: string;
  group_avatar?: string;
  participants?: { id: string; name: string; avatar: string }[];
}

export interface StatusItem {
  id: string;
  user_id: string;
  username: string;
  avatar: string;
  media_url: string;
  media_type?: "image" | "video" | "";
  text: string;
  bg_color?: string;
  font_style?: string;
  created_at: string;
  view_count?: number;
  viewed_by_me?: boolean;
}

export interface UserSettings {
  privacy?: Record<string, unknown>;
  security?: Record<string, unknown>;
  chats?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  storage?: Record<string, unknown>;
}
