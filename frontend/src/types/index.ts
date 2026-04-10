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

export interface ReactionItem {
  emoji: string;
  count: number;
  userIds: string[];
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
  reactions?: ReactionItem[];
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
  /** Present for group calls */
  group_id?: string;
  group_name?: string;
  group_avatar?: string;
  /** Participants in group call - for stacked avatars & comma names */
  participants?: { id: string; name: string; avatar: string }[];
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
  media_type?: "image" | "video" | "";
  text: string;
  bg_color?: string;
  font_style?: string;
  created_at: string;
  view_count?: number;
  viewers?: StatusViewer[];
  viewed_by_me?: boolean;
}

export interface UserSettings {
  privacy?: {
    last_seen?: "everyone" | "contacts" | "nobody";
    profile_photo?: "everyone" | "contacts" | "nobody";
    about?: "everyone" | "contacts" | "nobody";
    read_receipts?: boolean;
    blocked_ids?: string[];
    live_location?: boolean;
  };
  security?: {
    two_step_enabled?: boolean;
    two_step_pin?: string;
  };
  chats?: {
    last_backup_at?: string | null;
    enter_to_send?: boolean;
    media_visibility?: boolean;
    wallpaper?: string;
    wallpaper_color?: string | null;
  };
  notifications?: {
    messages_enabled?: boolean;
    message_tone?: string;
    message_vibrate?: boolean;
    message_popup?: boolean;
    group_enabled?: boolean;
    group_tone?: string;
    group_vibrate?: boolean;
    call_ringtone?: string;
    call_vibrate?: boolean;
  };
  storage?: {
    auto_download_photos?: boolean;
    auto_download_videos?: boolean;
    auto_download_documents?: boolean;
  };
}
