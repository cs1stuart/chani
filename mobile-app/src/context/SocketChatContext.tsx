import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import {
  fetchCalls,
  fetchConversations,
  fetchGroups,
  fetchStatuses,
  fetchUsers,
} from "@/api/client";
import { getApiUrl } from "@/lib/config";
import type { CallLogItem, Group, Message, StatusItem, User } from "@/types";

export type ConversationRow = {
  partner_id: string;
  last_message: string | null;
  last_message_time: string | null;
  last_sender_id: string;
  unread_count: number;
};

export type GroupConvMeta = {
  last_message: string;
  last_message_time: string;
  last_sender_id: string;
  last_sender_name: string;
  unread_count: number;
};

type Ctx = {
  /** Live socket for screen-level listeners (e.g. conversation). */
  socket: ReturnType<typeof io> | null;
  connected: boolean;
  users: User[];
  groups: Group[];
  conversations: Record<string, ConversationRow>;
  groupConversations: Record<string, GroupConvMeta>;
  callLogs: CallLogItem[];
  statuses: StatusItem[];
  refreshAll: () => Promise<void>;
  emitSendMessage: (payload: {
    senderId: string;
    content: string;
    type?: string;
    fileName?: string;
    receiverId?: string;
    groupId?: string;
  }) => void;
  emitMarkRead: (readerId: string, senderId: string) => void;
  emitMarkGroupRead: (groupId: string, userId: string) => void;
};

const SocketChatContext = createContext<Ctx | null>(null);

export function SocketChatProvider({
  token,
  userId,
  children,
}: {
  token: string;
  userId: string;
  children: React.ReactNode;
}) {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [conversations, setConversations] = useState<Record<string, ConversationRow>>({});
  const [groupConversations, setGroupConversations] = useState<Record<string, GroupConvMeta>>({});
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const refreshAll = useCallback(async () => {
    const [uList, convList, gList, calls, sts] = await Promise.all([
      fetchUsers(token),
      fetchConversations(token, userId),
      fetchGroups(token, userId),
      fetchCalls(token, userId),
      fetchStatuses(token),
    ]);
    setUsers(uList.filter((u) => u.id !== userId));
    const convMap: Record<string, ConversationRow> = {};
    for (const c of convList as ConversationRow[]) {
      convMap[c.partner_id] = c;
    }
    setConversations(convMap);
    if (Array.isArray(gList)) {
      setGroups(gList);
      const gMeta: Record<string, GroupConvMeta> = {};
      for (const g of gList as (Group & {
        last_message?: string;
        last_message_time?: string;
        last_sender_id?: string;
        last_sender_name?: string;
        unread_count?: number;
      })[]) {
        if (g.last_message || g.unread_count) {
          gMeta[g.id] = {
            last_message: g.last_message || "",
            last_message_time: g.last_message_time || "",
            last_sender_id: g.last_sender_id || "",
            last_sender_name: g.last_sender_name || "",
            unread_count: g.unread_count || 0,
          };
        }
      }
      setGroupConversations(gMeta);
    }
    setCallLogs(calls);
    setStatuses(sts);
  }, [token, userId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const url = getApiUrl();
    const s = io(url, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      s.emit("join", userId);
    });
    s.on("disconnect", () => setConnected(false));

    s.on("new_message", (message: Message) => {
      if (message.group_id) {
        const gid = String(message.group_id);
        setGroupConversations((prev) => {
          const existing = prev[gid];
          return {
            ...prev,
            [gid]: {
              last_message: message.content,
              last_message_time: String(message.timestamp),
              last_sender_id: message.sender_id,
              last_sender_name: message.sender_name || "",
              unread_count:
                message.sender_id !== userId
                  ? (existing?.unread_count || 0) + 1
                  : existing?.unread_count || 0,
            },
          };
        });
      } else {
        const partnerId =
          message.sender_id === userId ? message.receiver_id : message.sender_id;
        if (!partnerId) return;
        setConversations((prev) => {
          const existing = prev[partnerId];
          return {
            ...prev,
            [partnerId]: {
              partner_id: partnerId,
              last_message: message.content,
              last_message_time: String(message.timestamp),
              last_sender_id: message.sender_id,
              unread_count:
                message.sender_id !== userId
                  ? (existing?.unread_count || 0) + 1
                  : existing?.unread_count || 0,
            },
          };
        });
      }
    });

    s.on("user_status", ({ userId: uid, status }: { userId: string; status: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, status: status as User["status"] } : u)),
      );
    });

    s.on("group_created", (group: Group) => {
      setGroups((prev) => (prev.some((g) => g.id === group.id) ? prev : [...prev, group]));
    });

    s.on("join_new_group", ({ groupId }: { groupId: string }) => {
      s.emit("join_group", groupId);
    });

    s.on("group_member_left", ({ groupId, userId: leftId }: { groupId: string; userId: string }) => {
      if (leftId === userId) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setGroupConversations((prev) => {
          const next = { ...prev };
          delete next[groupId];
          return next;
        });
      }
    });

    s.on("group_deleted", ({ groupId }: { groupId: string }) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setGroupConversations((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    });

    return () => {
      s.removeAllListeners();
      s.close();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [token, userId]);

  const emitSendMessage = useCallback(
    (payload: {
      senderId: string;
      content: string;
      type?: string;
      fileName?: string;
      receiverId?: string;
      groupId?: string;
    }) => {
      socketRef.current?.emit("send_message", payload);
    },
    [],
  );

  const emitMarkRead = useCallback((readerId: string, senderId: string) => {
    socketRef.current?.emit("mark_read", { readerId, senderId });
  }, []);

  const emitMarkGroupRead = useCallback((groupId: string, uid: string) => {
    socketRef.current?.emit("mark_group_read", { groupId, userId: uid });
  }, []);

  const value = useMemo(
    () => ({
      socket,
      connected,
      users,
      groups,
      conversations,
      groupConversations,
      callLogs,
      statuses,
      refreshAll,
      emitSendMessage,
      emitMarkRead,
      emitMarkGroupRead,
    }),
    [
      socket,
      connected,
      users,
      groups,
      conversations,
      groupConversations,
      callLogs,
      statuses,
      refreshAll,
      emitSendMessage,
      emitMarkRead,
      emitMarkGroupRead,
    ],
  );

  // socket ref mutates; expose live socket via getter in hook — consumers use emitSendMessage
  return <SocketChatContext.Provider value={value}>{children}</SocketChatContext.Provider>;
}

export function useSocketChat() {
  const ctx = useContext(SocketChatContext);
  if (!ctx) throw new Error("useSocketChat inside SocketChatProvider");
  return ctx;
}
