import type { User, Group } from "@/types";

export type ConversationMap = Record<
  string,
  {
    last_message: string;
    last_message_time: string;
    last_sender_id: string;
    unread_count: number;
  }
>;

export type GroupConversationMap = Record<
  string,
  {
    last_message: string;
    last_message_time: string;
    last_sender_id: string;
    last_sender_name: string;
    unread_count: number;
  }
>;

export type SelectedChat = {
  type: "user" | "group";
  data: User | Group;
} | null;

export type CallState = {
  isReceivingCall: boolean;
  from: string;
  name: string;
  signal: unknown;
  type: "audio" | "video";
  status: "calling" | "ringing" | "connected";
  isGroupCall?: boolean;
  groupId?: string;
  groupName?: string;
  isGroupCallInitiator?: boolean;
} | null;
