"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { User, Message, Group, CallLogItem, StatusItem } from "@/types";
import Peer from "simple-peer";
import LoginPage from "@/components/shared/LoginPage";
import LoginCelebration from "@/components/shared/LoginCelebration";
import AppLayout from "@/components/shared/ChatApp/AppLayout";
import ChatSection from "@/components/shared/ChatApp/ChatSection";
import ModalsContainer from "@/components/shared/ChatApp/ModalsContainer";
import { useToast } from "@/components/ui/Toast";
import {
  requestNotificationPermission,
  showNotification,
  setDocumentTitle,
} from "@/lib/notifications";
import { formatMessagePreview } from "@/lib/utils";

export default function ChatApp() {
  const { showToast } = useToast();
  const backendUrl = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002") : "";
  // ── Auth State ──
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("workchat_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string>(
    () => localStorage.getItem("workchat_token") || "",
  );
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginCelebration, setShowLoginCelebration] = useState(false);

  // ── Data State ──
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<
    Record<
      string,
      {
        last_message: string;
        last_message_time: string;
        last_sender_id: string;
        unread_count: number;
      }
    >
  >({});
  const [groupConversations, setGroupConversations] = useState<
    Record<
      string,
      {
        last_message: string;
        last_message_time: string;
        last_sender_id: string;
        last_sender_name: string;
        unread_count: number;
      }
    >
  >({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [lastStatusOpenedAt, setLastStatusOpenedAt] = useState<string | null>(null);
  const [hasUnseenStatus, setHasUnseenStatus] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"chats" | "calls" | "status">("chats");
  const [showAddStatusModal, setShowAddStatusModal] = useState(false);
  const [selectedStatusForView, setSelectedStatusForView] = useState<{ statuses: StatusItem[]; index: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedChat, setSelectedChat] = useState<{
    type: "user" | "group";
    data: User | Group;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // ── UI State ──
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // ── Message Selection ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number | string>>(new Set());
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [avatarCropImageUrl, setAvatarCropImageUrl] = useState<string | null>(null);
  const [forwardTargets, setForwardTargets] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Profile Edit ──
  const [editUsername, setEditUsername] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editAbout, setEditAbout] = useState("");

  // ── Calling State ──
  const [call, _setCall] = useState<{
    isReceivingCall: boolean;
    from: string;
    name: string;
    signal: any;
    type: "audio" | "video";
    status: "calling" | "ringing" | "connected";
    isGroupCall?: boolean;
    groupId?: string;
    groupName?: string;
    isGroupCallInitiator?: boolean;
  } | null>(null);
  const callRef = useRef(call);
  const setCall = (val: any) => {
    const nextVal = typeof val === "function" ? val(callRef.current) : val;
    callRef.current = nextVal;
    _setCall(nextVal);
  };
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, _setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const setStream = (val: MediaStream | null) => {
    streamRef.current = val;
    _setStream(val);
  };
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [groupRemoteStreams, setGroupRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [groupCallParticipantIds, setGroupCallParticipantIds] = useState<string[]>([]);
  const [callGroupMembers, setCallGroupMembers] = useState<User[]>([]);
  const [remoteVideoOff, setRemoteVideoOff] = useState<Record<string, boolean>>({});
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callMinimized, setCallMinimized] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const groupConnectionRef = useRef<Map<string, Peer.Instance>>(new Map());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<{
    recorder: MediaRecorder;
    chunks: Blob[];
    fileWriter?: WritableStreamDefaultWriter<Blob>;
    fileHandle?: FileSystemFileHandle;
  } | null>(null);
  const mixedStreamRef = useRef<MediaStream | null>(null);
  const recordCleanupRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const groupCallRef = useRef<{ groupId: string } | null>(null);

  // ── Pagination ──
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);

  // ── Refs ──
  const socketRef = useRef<Socket | null>(null);
  const selectedChatRef = useRef(selectedChat);
  selectedChatRef.current = selectedChat;
  const usersRef = useRef(users);
  usersRef.current = users;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);
  const callDurationRef = useRef(0);
  const callAcceptedRef = useRef(false);
  callAcceptedRef.current = callAccepted;
  const callLogSentRef = useRef(false);
  const isSwitchingToGroupRef = useRef(false);

  // ── Helpers ──
  const safeStopTrack = (track: MediaStreamTrack) => {
      try {
      if (track.readyState !== "ended") track.stop();
          } catch {
      // ignore AbortError, InvalidStateError, etc.
    }
  };

  const stopScreenStream = () => {
    const ss = screenStreamRef.current;
    if (ss) {
      ss.getTracks().forEach(safeStopTrack);
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  };

  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(safeStopTrack);
      streamRef.current = null;
      setStream(null);
    }
  };

  const authFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenRef.current}`,
      },
    });
  };

  // ── Data Fetching ──
  const fetchUsers = async () => {
    try {
      const res = await authFetch("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data))
        setUsers(data.filter((u: User) => u.id !== currentUser?.id));
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
  };

  const fetchConversations = async () => {
    if (!currentUser) return;
    try {
      const res = await authFetch(`/api/conversations/${currentUser.id}`);
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to load conversations:", data);
        return;
      }
      if (!Array.isArray(data)) {
        console.warn("Unexpected conversations response, not an array:", data);
        return;
      }
      const map: Record<
        string,
        {
          last_message: string;
          last_message_time: string;
          last_sender_id: string;
          unread_count: number;
        }
      > = {};
      data.forEach((c: any) => {
        map[c.partner_id] = {
          last_message: c.last_message,
          last_message_time: c.last_message_time,
          last_sender_id: c.last_sender_id,
          unread_count: c.unread_count || 0,
        };
      });
      setConversations(map);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  const fetchGroups = async () => {
    if (!currentUser) return;
    try {
      const res = await authFetch(`/api/groups/${currentUser.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setGroups(data);
        const gMap: Record<
          string,
          {
            last_message: string;
            last_message_time: string;
            last_sender_id: string;
            last_sender_name: string;
            unread_count: number;
          }
        > = {};
        for (const g of data) {
          if (g.last_message || g.unread_count) {
            gMap[g.id] = {
              last_message: g.last_message || "",
              last_message_time: g.last_message_time || "",
              last_sender_id: g.last_sender_id || "",
              last_sender_name: g.last_sender_name || "",
              unread_count: g.unread_count || 0,
            };
          }
        }
        setGroupConversations(gMap);
      }
    } catch (e) {
      console.error("Failed to fetch groups:", e);
    }
  };

  const fetchCalls = async () => {
    if (!currentUser) return;
    try {
      const res = await authFetch(`/api/calls/${currentUser.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCallLogs([]);
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to fetch calls:", res.status, data);
        }
        return;
      }
      setCallLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setCallLogs([]);
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to fetch calls:", e);
      }
    }
  };

  const fetchStatuses = async () => {
    if (!currentUser) return;
    try {
      const res = await authFetch("/api/status");
      if (!res.ok) return;
      const data = await res.json();
      const list: StatusItem[] = Array.isArray(data) ? data : [];
      setStatuses(list);
      if (activeSidebarTab !== "status") {
        const lastSeen = lastStatusOpenedAt ? new Date(lastStatusOpenedAt) : null;
        const hasNew = list.some(
          (s) =>
            s.user_id !== currentUser.id &&
            (!lastSeen || new Date(s.created_at) > lastSeen),
        );
        setHasUnseenStatus(hasNew);
      }
    } catch (e) {
      console.error("Failed to fetch statuses:", e);
    }
  };

  const PAGE_SIZE = 10;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "`" || e.key === "~") {
        if (selectedChat) setSelectedChat(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedChat]);

  const setHasMoreSync = (v: boolean) => { hasMoreRef.current = v; setHasMore(v); };
  const setLoadingMoreSync = (v: boolean) => { loadingMoreRef.current = v; setLoadingMore(v); };

  const fetchMessages = async (u1: string, u2: string, beforeId?: number | string) => {
    try {
      const qs = `?limit=${PAGE_SIZE}${beforeId ? `&before=${beforeId}` : ""}`;
      const res = await authFetch(`/api/messages/${u1}/${u2}${qs}`);
      const data = await res.json();
      if (!res.ok) {
        if (!beforeId) setMessages([]);
        return;
      }
      const msgs = data.messages ?? data;
      if (!Array.isArray(msgs)) {
        if (!beforeId) setMessages([]);
        return;
      }
      setHasMoreSync(!!data.hasMore);
      if (beforeId) {
        setMessages((prev) => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      if (!beforeId) setMessages([]);
    }
  };

  const fetchGroupMessages = async (groupId: string, beforeId?: number | string) => {
    try {
      const qs = `?limit=${PAGE_SIZE}${beforeId ? `&before=${beforeId}` : ""}`;
      const res = await authFetch(`/api/group-messages/${groupId}${qs}`);
      const data = await res.json();
      if (!res.ok) {
        if (!beforeId) setMessages([]);
        return;
      }
      const msgs = data.messages ?? data;
      if (!Array.isArray(msgs)) {
        if (!beforeId) setMessages([]);
        return;
      }
      setHasMoreSync(!!data.hasMore);
      if (beforeId) {
        setMessages((prev) => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
      }
    } catch (err) {
      console.error("Error fetching group messages:", err);
      if (!beforeId) setMessages([]);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const res = await authFetch(`/api/group-members/${groupId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setGroupMembers(data);
    } catch (e) {
      console.error("Failed to fetch group members:", e);
    }
  };

  const fetchCallGroupMembers = async (groupId: string) => {
    try {
      const res = await authFetch(`/api/group-members/${groupId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setCallGroupMembers(data);
    } catch (e) {
      console.error("Failed to fetch call group members:", e);
    }
  };

  // Fetch group members when in a group call (so Add participant button shows list)
  useEffect(() => {
    if (call?.isGroupCall && call?.groupId) {
      fetchCallGroupMembers(call.groupId);
    } else {
      setCallGroupMembers([]);
    }
  }, [call?.isGroupCall, call?.groupId]);

  // Keep self-view video in sync with stream (camera/screen share); force refresh when tracks change
  useEffect(() => {
    const v = myVideo.current;
    const s = streamRef.current;
    const c = callRef.current;
    if (!v) return;
    if (!s || !c || c.type !== "video") {
      v.srcObject = null;
      return;
    }
    const tracks = s.getTracks();
    if (tracks.length === 0) {
      v.srcObject = null;
      return;
    }
    // Assign a new MediaStream so the video element refreshes when tracks are replaced (e.g. screen share)
    v.srcObject = new MediaStream(tracks);
    v.play().catch(() => {});
  }, [stream, isScreenSharing]);

  // Keep remote video in sync when remote switches camera/screen share (track replacement)
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);
  useEffect(() => {
    const s = userStream;
    if (!s) return;
    const onTrackChange = () => setRemoteStreamVersion((n) => n + 1);
    s.addEventListener("addtrack", onTrackChange);
    s.addEventListener("removetrack", onTrackChange);
    // When remote replaces track (e.g. screen share), old video track fires "ended"
    s.getVideoTracks().forEach((t) => t.addEventListener("ended", onTrackChange));
    return () => {
      s.removeEventListener("addtrack", onTrackChange);
      s.removeEventListener("removetrack", onTrackChange);
      s.getVideoTracks().forEach((t) => t.removeEventListener("ended", onTrackChange));
    };
  }, [userStream]);
  useEffect(() => {
    const v = userVideo.current;
    const s = userStream;
    if (!v || !s || callRef.current?.type !== "video") return;
    const tracks = s.getVideoTracks();
    if (tracks.length === 0) return;
    v.srcObject = new MediaStream(s.getTracks());
    v.play().catch(() => {});
  }, [userStream, remoteStreamVersion]);

  const prevScrollHeightRef = useRef(0);
  const isLoadingOlderRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const loadOlderMessages = async () => {
    const chat = selectedChatRef.current;
    if (!chat || !currentUser) return;
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    const curMsgs = messagesRef.current;
    if (!curMsgs.length) return;

    const oldestId = curMsgs[0].id;
    const el = chatScrollRef.current;
    prevScrollHeightRef.current = el?.scrollHeight || 0;
    isLoadingOlderRef.current = true;
    setLoadingMoreSync(true);

    try {
      if (chat.type === "user") {
        await fetchMessages(currentUser.id, chat.data.id, oldestId);
      } else {
        await fetchGroupMessages(chat.data.id, oldestId);
      }
    } finally {
      setLoadingMoreSync(false);
    }
  };

  useLayoutEffect(() => {
    if (isLoadingOlderRef.current) {
      const el = chatScrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      }
      isLoadingOlderRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (!hasMore || loadingMore || !messages.length) return;
    const el = chatScrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) {
      loadOlderMessages();
    }
  }, [messages, hasMore, loadingMore]);

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    if (el.scrollTop < 60) {
      loadOlderMessages();
    }
  };

  // ── Socket Connection ──
  useEffect(() => {
    if (currentUser) {
      const socketUrl =
        typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_URL ?? "" : "";
      socketRef.current = io(socketUrl, { auth: { token: tokenRef.current } });

      socketRef.current.on("connect", () => {
        setIsConnected(true);
        socketRef.current?.emit("join", currentUser.id);
        requestNotificationPermission();
      });

      socketRef.current.on("disconnect", () => setIsConnected(false));

      socketRef.current.on("connect_error", (err) => {
        if (
          err.message === "Authentication required" ||
          err.message === "Invalid or expired token"
        ) {
          localStorage.removeItem("workchat_token");
          localStorage.removeItem("workchat_user");
          setToken("");
          setCurrentUser(null);
        }
      });

      socketRef.current.on("new_message", (message: Message) => {
        const cur = selectedChatRef.current;
        const belongsToOpenChat = cur
          ? message.group_id
            ? cur.type === "group" && cur.data.id === message.group_id
            : cur.type === "user" &&
            ((message.sender_id === currentUser.id &&
              message.receiver_id === cur.data.id) ||
              (message.sender_id === cur.data.id &&
                message.receiver_id === currentUser.id))
          : false;

        if (belongsToOpenChat) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }

        if (message.group_id) {
          const isFromOther = message.sender_id !== currentUser.id;
          const chatIsOpen =
            cur?.type === "group" && cur.data.id === message.group_id;
          setGroupConversations((prev) => {
            const existing = prev[message.group_id!];
            return {
              ...prev,
              [message.group_id!]: {
                last_message: message.content,
                last_message_time: message.timestamp,
                last_sender_id: message.sender_id,
                last_sender_name: message.sender_name || "",
                unread_count:
                  isFromOther && !chatIsOpen
                    ? (existing?.unread_count || 0) + 1
                    : chatIsOpen
                      ? 0
                      : existing?.unread_count || 0,
              },
            };
          });
          if (isFromOther && chatIsOpen) {
            socketRef.current?.emit("mark_group_read", {
              groupId: message.group_id,
              userId: currentUser.id,
            });
          }
        } else {
          const partnerId =
            message.sender_id === currentUser.id
              ? message.receiver_id
              : message.sender_id;
          if (partnerId) {
            const isFromOther = message.sender_id !== currentUser.id;
            const chatIsOpen =
              cur?.type === "user" && cur.data.id === partnerId;
            setConversations((prev) => {
              const existing = prev[partnerId];
              return {
                ...prev,
                [partnerId]: {
                  last_message: message.content,
                  last_message_time: message.timestamp,
                  last_sender_id: message.sender_id,
                  unread_count:
                    isFromOther && !chatIsOpen
                      ? (existing?.unread_count || 0) + 1
                      : chatIsOpen
                        ? 0
                        : existing?.unread_count || 0,
                },
              };
            });
            if (isFromOther && chatIsOpen) {
              socketRef.current?.emit("mark_read", {
                readerId: currentUser.id,
                senderId: message.sender_id,
              });
            }
          }
        }

        if (typeof document !== "undefined" && document.hidden && !belongsToOpenChat && message.sender_id !== currentUser.id) {
          const senderName = message.group_id
            ? (message.sender_name || "Someone")
            : (usersRef.current.find((u) => u.id === message.sender_id)?.username ?? "Someone");
          const body =
            message.type === "text"
              ? (message.content?.slice(0, 80) || "New message")
              : message.type === "image"
                ? "Sent a photo"
                : message.type === "file"
                  ? "Sent a file"
                  : message.type === "call"
                    ? "Voice/Video call"
                    : "New message";
          showNotification(senderName, {
            body: body.length > 60 ? body.slice(0, 60) + "…" : body,
            tag: `msg-${message.group_id || message.sender_id}-${Date.now()}`,
          });
        }
      });

      socketRef.current.on(
        "user_status",
        ({ userId, status }: { userId: string; status: string }) => {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId ? { ...u, status: status as any } : u,
            ),
          );
        },
      );

      socketRef.current.on("group_created", (group: Group) => {
        setGroups((prev) =>
          prev.some((g) => g.id === group.id) ? prev : [...prev, group],
        );
      });

      socketRef.current.on(
        "join_new_group",
        ({ groupId }: { groupId: string }) => {
          socketRef.current?.emit("join_group", groupId);
        },
      );

      socketRef.current.on(
        "group_members_updated",
        ({ groupId }: { groupId: string }) => {
          const cur = selectedChatRef.current;
          if (cur?.type === "group" && cur.data.id === groupId) {
            fetchGroupMembers(groupId);
          }
        },
      );

      socketRef.current.on(
        "group_member_left",
        ({ groupId, userId }: { groupId: string; userId: string }) => {
          const cur = selectedChatRef.current;
          if (userId === currentUser.id) {
            // current user left or was removed from this group
            setGroups((prev) => prev.filter((g) => g.id !== groupId));
            setGroupConversations((prev) => {
              const next = { ...prev };
              delete next[groupId];
              return next;
            });
            if (cur?.type === "group" && cur.data.id === groupId) {
              setSelectedChat(null);
              setShowChatInfo(false);
            }
          } else if (cur?.type === "group" && cur.data.id === groupId) {
            // another member left; refresh member list if panel open
            fetchGroupMembers(groupId);
          }
        },
      );

      socketRef.current.on(
        "group_deleted",
        ({ groupId }: { groupId: string }) => {
          setGroups((prev) => prev.filter((g) => g.id !== groupId));
          setGroupConversations((prev) => {
            const next = { ...prev };
            delete next[groupId];
            return next;
          });
          const cur = selectedChatRef.current;
          if (cur?.type === "group" && cur.data.id === groupId) {
            setSelectedChat(null);
            setShowChatInfo(false);
          }
        },
      );

      socketRef.current.on("incoming_call", ({ from, fromName, signal, type }: { from: string; fromName?: string; signal: unknown; type: "audio" | "video" }) => {
        if (callRef.current) return;
        const caller = users.find((u) => u.id === from);
        const callerName = fromName || caller?.username || "Unknown";
        setCall({
          isReceivingCall: true,
          from,
          name: callerName,
          signal,
          type,
          status: "ringing",
        });
        socketRef.current?.emit("call_received", { to: from });
        if (typeof document !== "undefined" && document.hidden) {
          setDocumentTitle(`Incoming ${type === "video" ? "video" : "voice"} call - ${callerName}`);
          showNotification(`Incoming call from ${callerName}`, {
            body: type === "video" ? "Video call" : "Voice call",
            tag: "call",
          });
        }
      });

      socketRef.current.on("call_ringing", () =>
        setCall((prev: any) => (prev ? { ...prev, status: "ringing" } : null)),
      );
      socketRef.current.on("call_accepted", (signal: any) => {
        setCallAccepted(true);
        setCall((prev: any) =>
          prev ? { ...prev, status: "connected" } : null,
        );
        connectionRef.current?.signal(signal);
      });
      socketRef.current.on("call_rejected", () => {
        if (callRef.current && !callLogSentRef.current) {
          logCallMessage("declined");
        }
        stopMediaStream();
        setCall(null);
        setDocumentTitle("WorkChat");
        showToast("Call rejected", "info");
      });
      socketRef.current.on("call_ended", () => {
        if (callRef.current?.isGroupCall) return;
        if (callRef.current && !callLogSentRef.current) {
          const wasConnected = callAcceptedRef.current && (callDurationRef.current > 0 || callRef.current.status === "connected");
          if (wasConnected) {
            logCallMessage("completed");
          } else {
            const wasIncoming = callRef.current.isReceivingCall;
            if (wasIncoming) {
              logCallMessage("missed");
            } else {
              logCallMessage("cancelled");
            }
          }
        }
        setCallEnded(true);
        stopMediaStream();
        setDocumentTitle("WorkChat");
        leaveCall();
      });

      socketRef.current.on("incoming_group_call", ({ groupId, from, type, groupName }: { groupId: string; from: string; type: "audio" | "video"; groupName: string }) => {
        if (callRef.current?.status === "connected") return;
        const caller = usersRef.current.find((u) => u.id === from) || groupMembers.find((m) => m.id === from);
        const callerName = caller?.username || "Unknown";
        setCall({
          isReceivingCall: true,
          from,
          name: `${groupName} (${callerName})`,
          signal: null,
          type,
          status: "ringing",
          isGroupCall: true,
          groupId,
          groupName,
          isGroupCallInitiator: false,
        });
        groupCallRef.current = { groupId };
        if (typeof document !== "undefined" && document.hidden) {
          setDocumentTitle(`Incoming ${type === "video" ? "video" : "voice"} call - ${groupName}`);
          showNotification(`Incoming ${type} call in ${groupName}`, { body: `From ${callerName}`, tag: "call" });
        }
      });

      socketRef.current.on("group_call_participants", ({ groupId, participants, type }: { groupId: string; participants: string[]; type: "audio" | "video" }) => {
        const myStream = streamRef.current;
        if (!myStream || !currentUser) return;
        // Ensure joiner has group members for Add participant button
        fetchCallGroupMembers(groupId);
        setGroupCallParticipantIds((prev) => {
          const set = new Set(prev.map((id) => String(id)));
          participants.forEach((id) => set.add(String(id)));
          set.add(String(currentUser.id));
          return Array.from(set);
        });
        participants.forEach((remoteId) => {
          const rid = String(remoteId);
          if (rid === String(currentUser.id)) return;
          if (groupConnectionRef.current.has(rid)) return; // already have peer (e.g. from group_call_participant_joined)
          const peer = new Peer({ initiator: true, trickle: false, stream: myStream });
          peer.on("signal", (data) => socketRef.current?.emit("group_call_signal", { groupId, to: rid, signal: data }));
          peer.on("stream", (s) => setGroupRemoteStreams((prev) => ({ ...prev, [rid]: s })));
          peer.on("close", () => {
            groupConnectionRef.current.delete(rid);
            setGroupRemoteStreams((prev) => {
              const next = { ...prev };
              delete next[rid];
              return next;
            });
            setGroupCallParticipantIds((p) => p.filter((id) => String(id) !== rid));
          });
          peer.on("error", () => {});
          groupConnectionRef.current.set(rid, peer);
        });
        setCallAccepted(true);
        setCall((p: any) => (p ? { ...p, status: "connected" } : null));
      });

      socketRef.current.on("group_call_participant_joined", ({ groupId, userId, type }: { groupId: string; userId: string; type: "audio" | "video" }) => {
        const myStream = streamRef.current;
        const uid = String(userId);
        if (!myStream || !currentUser || uid === String(currentUser.id)) return;
        if (groupConnectionRef.current.has(uid)) return; // already have peer (e.g. from group_call_participants)
        setGroupCallParticipantIds((p) => (p.some((id) => String(id) === uid) ? p : [...p, uid]));
        setCall((p: any) => (p ? { ...p, status: "connected" } : null));
        const peer = new Peer({ initiator: false, trickle: false, stream: myStream });
        peer.on("signal", (data) => socketRef.current?.emit("group_call_signal", { groupId, to: uid, signal: data }));
        peer.on("stream", (s) => setGroupRemoteStreams((prev) => ({ ...prev, [uid]: s })));
        peer.on("close", () => {
          groupConnectionRef.current.delete(uid);
          setGroupRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[uid];
            return next;
          });
          setGroupCallParticipantIds((p) => p.filter((id) => String(id) !== uid));
        });
        peer.on("error", () => {});
        groupConnectionRef.current.set(uid, peer);
      });

      socketRef.current.on("group_call_signal", ({ from, signal }: { from: string; signal: unknown }) => {
        const fid = String(from);
        const peer = groupConnectionRef.current.get(fid) ?? groupConnectionRef.current.get(from);
        if (peer) peer.signal(signal as Peer.SignalData);
      });

      socketRef.current.on("group_call_participant_left", ({ userId }: { groupId: string; userId: string }) => {
        const uid = String(userId);
        const peer = groupConnectionRef.current.get(uid) ?? groupConnectionRef.current.get(userId);
        if (peer) {
          try { peer.destroy(); } catch {}
          groupConnectionRef.current.delete(uid);
        }
        setGroupRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
        setGroupCallParticipantIds((p) => p.filter((id) => String(id) !== uid));
      });

      socketRef.current.on("group_call_ended", async () => {
        // Stop recording if active
        if (recorderRef.current) {
          try {
            await stopAndSaveRecording();
          } catch {}
        }
        setIsRecording(false);
        // Stop streams before destroying peers to avoid "Close called" console errors
        stopScreenStream();
        stopMediaStream();
        groupConnectionRef.current.forEach((p) => { try { p.destroy(); } catch {} });
        groupConnectionRef.current.clear();
        setGroupRemoteStreams({});
        setGroupCallParticipantIds([]);
        setRemoteVideoOff({});
        groupCallRef.current = null;
        setCallEnded(true);
        setDocumentTitle("WorkChat");
        setCall(null);
        setUserStream(null);
        setCallAccepted(false);
        setCallEnded(false);
        setIsMuted(false);
        setIsVideoOff(false);
      });

      socketRef.current.on("group_call_participant_video_off", ({ userId }: { userId: string }) => {
        setRemoteVideoOff((p) => ({ ...p, [userId]: true }));
      });
      socketRef.current.on("group_call_participant_video_on", ({ userId }: { userId: string }) => {
        setRemoteVideoOff((p) => ({ ...p, [userId]: false }));
      });

      socketRef.current.on("invite_to_group_call_sent", () => {
        showToast("Invitation sent", "success");
      });
      socketRef.current.on("invite_to_group_call_failed", (data: { reason?: string }) => {
        showToast(data?.reason || "Could not send invitation", "error");
      });

      socketRef.current.on("call_upgrading_to_group", () => {
        isSwitchingToGroupRef.current = true;
      });

      socketRef.current.on("switch_to_group_call", ({ groupId, groupName, type, isGroupCallInitiator }: { groupId: string; groupName: string; type: "audio" | "video"; isGroupCallInitiator?: boolean }) => {
        if (!currentUser || !streamRef.current) return;
        try {
          isSwitchingToGroupRef.current = true;
          try {
            connectionRef.current?.destroy();
          } catch {}
          connectionRef.current = null;
          setUserStream(null);
          groupCallRef.current = { groupId };
          setGroupCallParticipantIds((p) => {
            const set = new Set<string>();
            (p || []).forEach((id) => set.add(String(id)));
            set.add(String(currentUser.id));
            return Array.from(set);
          });
          setCall((p: any) =>
            p ? { ...p, isGroupCall: true, groupId, groupName, status: "connected", isGroupCallInitiator: isGroupCallInitiator ?? false } : null
          );
          socketRef.current?.emit("join_group_call", { groupId });
        } catch (err) {
          console.error("switch_to_group_call error:", err);
        } finally {
          setTimeout(() => { isSwitchingToGroupRef.current = false; }, 2000);
        }
      });

      socketRef.current.on("user_updated", (updatedUser: User) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === updatedUser.id ? { ...u, ...updatedUser } : u,
          ),
        );
        if (
          selectedChat?.type === "user" &&
          selectedChat.data.id === updatedUser.id
        ) {
          setSelectedChat({
            type: "user",
            data: { ...selectedChat.data, ...updatedUser },
          });
        }
      });

      socketRef.current.on("error", (err: { message: string }) =>
        showToast(err.message, "error"),
      );
      socketRef.current.on("message_deleted", (messageId: string) =>
        setMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId))),
      );

      socketRef.current.on("message_edited", (payload: { id: string; content: string; edited_at: string }) =>
        setMessages((prev) => prev.map((m) => (String(m.id) === String(payload.id) ? { ...m, content: payload.content, edited_at: payload.edited_at } : m))),
      );

      socketRef.current.on("reaction_added", (payload: { messageId: string; userId: string; emoji: string }) => {
        setMessages((prev) => prev.map((m) => {
          if (String(m.id) !== String(payload.messageId)) return m;
          const reactions = (m.reactions || []).map((r) => {
            if (r.emoji === payload.emoji) return r;
            return { ...r, userIds: r.userIds.filter((id) => id !== payload.userId), count: r.userIds.filter((id) => id !== payload.userId).length };
          }).filter((r) => r.count > 0);
          const existingEmoji = reactions.find((r) => r.emoji === payload.emoji);
          const userIds = existingEmoji ? existingEmoji.userIds : [];
          const newUserIds = userIds.includes(payload.userId) ? userIds : [...userIds, payload.userId];
          const newReactions = [...reactions.filter((r) => r.emoji !== payload.emoji), { emoji: payload.emoji, count: newUserIds.length, userIds: newUserIds }].filter((r) => r.count > 0);
          return { ...m, reactions: newReactions };
        }));
      });

      socketRef.current.on("reaction_removed", (payload: { messageId: string; userId: string }) => {
        setMessages((prev) => prev.map((m) => {
          if (String(m.id) !== String(payload.messageId)) return m;
          const reactions = (m.reactions || []).map((r) => {
            if (!r.userIds.includes(payload.userId)) return r;
            const newUserIds = r.userIds.filter((id) => id !== payload.userId);
            return { ...r, userIds: newUserIds, count: newUserIds.length };
          }).filter((r) => r.count > 0);
          return { ...m, reactions };
        }));
      });

      socketRef.current.on(
        "messages_read",
        ({ readBy, senderId }: { readBy: string; senderId: string }) => {
          if (senderId === currentUser.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.sender_id === currentUser.id &&
                  m.receiver_id === readBy &&
                  !m.read_at
                  ? { ...m, read_at: new Date().toISOString() }
                  : m,
              ),
            );
          }
        },
      );

      socketRef.current.on(
        "group_read_update",
        ({ reads, totalMembers }: { groupId: string; userId: string; reads: Record<string, number>; totalMembers: number }) => {
          setMessages((prev) =>
            prev.map((m) => {
              const newCount = reads[String(m.id)];
              if (newCount !== undefined) {
                return { ...m, read_count: newCount, total_members: totalMembers };
              }
              return m;
            }),
          );
        },
      );

      fetchUsers();
      fetchGroups();
      fetchConversations();
      fetchCalls();
      fetchStatuses();

      socketRef.current.on("status_created", () => {
        fetchStatuses();
      });

      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeSidebarTab === "calls") fetchCalls();
    if (activeSidebarTab === "status") {
      setLastStatusOpenedAt(new Date().toISOString());
      setHasUnseenStatus(false);
      fetchStatuses();
    }
  }, [currentUser, activeSidebarTab]);

  // ── Chat Selection ──
  useEffect(() => {
    if (selectedChat && currentUser) {
      setHasMoreSync(false);
      setLoadingMoreSync(false);
      isNearBottom.current = true;
      isLoadingOlderRef.current = false;
      if (selectedChat.type === "user") {
        fetchMessages(currentUser.id, selectedChat.data.id);
        socketRef.current?.emit("mark_read", {
          readerId: currentUser.id,
          senderId: selectedChat.data.id,
        });
        setConversations((prev) => {
          const existing = prev[selectedChat.data.id];
          if (!existing) return prev;
          return {
            ...prev,
            [selectedChat.data.id]: { ...existing, unread_count: 0 },
          };
        });
      } else {
        fetchGroupMessages(selectedChat.data.id);
        fetchGroupMembers(selectedChat.data.id);
        socketRef.current?.emit("mark_group_read", {
          groupId: selectedChat.data.id,
          userId: currentUser.id,
        });
        setGroupConversations((prev) => {
          const existing = prev[selectedChat.data.id];
          if (!existing) return prev;
          return {
            ...prev,
            [selectedChat.data.id]: { ...existing, unread_count: 0 },
          };
        });
      }
      exitSelectMode();
      setReplyTo(null);
    }
  }, [selectedChat, currentUser]);

  const isNearBottom = useRef(true);

  useEffect(() => {
    if (isLoadingOlderRef.current) return;
    if (!isNearBottom.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const trackScrollPosition = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const threshold = 150;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const status = call?.status ?? null;
    const isGroupCall = Boolean(call?.isGroupCall);
    const shouldRunTimer =
      status === "connected" ||
      (isGroupCall && status === "calling");
    if (shouldRunTimer) {
      interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [call]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // ── Favicon / Tab Title ──
  useEffect(() => {
    let totalUnread = 0;
    Object.keys(conversations).forEach((k) => {
      totalUnread += conversations[k]?.unread_count || 0;
    });
    Object.keys(groupConversations).forEach((k) => {
      totalUnread += groupConversations[k]?.unread_count || 0;
    });

    document.title = totalUnread > 0 ? `(${totalUnread}) WorkChat` : "WorkChat";

    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#00a884";
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("W", 16, 17);
    if (totalUnread > 0) {
      ctx.fillStyle = "#ff3b30";
      ctx.beginPath();
      ctx.arc(26, 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = canvas.toDataURL("image/png");
  }, [conversations, groupConversations]);

  // ── Handlers ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Login failed");
        return;
      }
      const { token: newToken, ...userData } = data;
      setToken(newToken);
      tokenRef.current = newToken;
      localStorage.setItem("workchat_token", newToken);
      localStorage.setItem("workchat_user", JSON.stringify(userData));
      setCurrentUser(userData);
      setShowLoginCelebration(true);
    } catch {
      setLoginError("Connection error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("workchat_token");
    localStorage.removeItem("workchat_user");
    setToken("");
    setCurrentUser(null);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !selectedChat || !currentUser) return;

    let content = inputValue;
    if (replyTo) {
      const replyName =
        replyTo.sender_id === currentUser.id
          ? "You"
          : replyTo.sender_name ||
          users.find((u) => u.id === replyTo.sender_id)?.username ||
          "User";
      const replyPreview = formatMessagePreview(replyTo);
      const replyData = JSON.stringify({
        n: replyName,
        t: replyPreview,
        tp: replyTo.type,
        img: replyTo.type === "image" ? replyTo.content : undefined,
      });
      const encoded = btoa(unescape(encodeURIComponent(replyData)));
      content = `[RPL:${encoded}]${inputValue}`;
    }

    const messageData: any = {
      senderId: currentUser.id,
      content,
      type: "text",
    };
    if (selectedChat.type === "user")
      messageData.receiverId = selectedChat.data.id;
    else messageData.groupId = selectedChat.data.id;

    socketRef.current?.emit("send_message", messageData);
    setInputValue("");
    setReplyTo(null);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setShowEmojiPicker(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat || !currentUser) return;
    e.target.value = "";
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        showToast(err.error || "File upload failed", "error");
        return;
      }
      const data = await res.json();
      const messageData: any = {
        senderId: currentUser.id,
        content: data.url,
        type: data.type,
        fileName: data.fileName,
      };
      if (selectedChat.type === "user")
        messageData.receiverId = selectedChat.data.id;
      else messageData.groupId = selectedChat.data.id;
      socketRef.current?.emit("send_message", messageData);
    } catch (err) {
      console.error("File upload failed:", err);
      showToast("File upload failed. Please try again.", "error");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleVoiceSend = async (blob: Blob) => {
    if (!selectedChat || !currentUser) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "voice-message.webm");
      const res = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        showToast(err.error || "Voice message upload failed", "error");
        return;
      }
      const data = await res.json();
      const messageData: any = {
        senderId: currentUser.id,
        content: data.url,
        type: data.type || "audio",
        fileName: data.fileName,
      };
      if (selectedChat.type === "user")
        messageData.receiverId = selectedChat.data.id;
      else messageData.groupId = selectedChat.data.id;
      socketRef.current?.emit("send_message", messageData);
    } catch (err) {
      console.error("Voice upload failed:", err);
      showToast("Voice message upload failed. Please try again.", "error");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || !currentUser)
      return;
    try {
      const res = await authFetch("/api/groups", {
        method: "POST",
        body: JSON.stringify({
          name: groupName,
          members: selectedMembers,
          createdBy: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create group", "error");
        return;
      }
      socketRef.current?.emit("create_group", {
        ...data,
        members: selectedMembers,
      });
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      setSelectedChat({ type: "group", data });
    } catch (err) {
      console.error("Group creation failed:", err);
      showToast("Failed to create group. Please try again.", "error");
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    const res = await authFetch("/api/users/update", {
      method: "POST",
      body: JSON.stringify({
        id: currentUser.id,
        username: editUsername,
        avatar: editAvatar,
        about: editAbout,
      }),
    });
    if (res.ok) {
      const updated = {
        ...currentUser,
        username: editUsername,
        avatar: editAvatar,
        about: editAbout,
      };
      setCurrentUser(updated);
      localStorage.setItem("workchat_user", JSON.stringify(updated));
      socketRef.current?.emit("update_profile", { id: currentUser.id });
      setShowProfileSettings(false);
    }
  };

  const doAvatarUpload = async (file: File | Blob) => {
    if (!file) return;
    try {
      const formData = new FormData();
      const f = file instanceof Blob && !(file instanceof File) ? new File([file], "avatar.jpg", { type: "image/jpeg" }) : file;
      formData.append("file", f);
      const res = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        showToast(err.error || "Avatar upload failed", "error");
        return;
      }
      const data = await res.json();
      if (data.url) {
        setEditAvatar(data.url);
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
      showToast("Avatar upload failed. Please try again.", "error");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (dataUrl) setAvatarCropImageUrl(dataUrl);
      };
      reader.readAsDataURL(file);
      return;
    }
    await doAvatarUpload(file);
  };

  const handleCreateStatus = async (payload: {
    text?: string;
    mediaUrl?: string;
    file?: File;
    mediaType?: string;
    bgColor?: string;
    fontStyle?: string;
  }) => {
    if (!currentUser) return;
    let mediaUrl = payload.mediaUrl || "";
    let mediaType = payload.mediaType || "";
    if (payload.file) {
      const formData = new FormData();
      formData.append("file", payload.file);
      const res = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const base = backendUrl;
      mediaUrl = data.url?.startsWith("http") ? data.url : base + (data.url || "");
      if (!mediaType && data.type) mediaType = data.type === "video" ? "video" : "image";
    }
    const res = await authFetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: payload.text || "",
        mediaUrl,
        mediaType,
        bgColor: payload.bgColor || "",
        fontStyle: payload.fontStyle || "",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to post status");
    }
    showToast("Status posted!", "success");
    fetchStatuses();
  };

  const handleSelectCall = (item: CallLogItem) => {
    if (item.group_id) {
      const group = groups.find((g) => g.id === item.group_id) || {
        id: item.group_id,
        name: item.group_name || "Group",
        avatar: item.group_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.group_name || "Group")}`,
        created_by: "",
        created_at: "",
      };
      setSelectedChat({ type: "group", data: group });
    } else {
      const user = users.find((u) => u.id === item.other_user_id) || {
        id: item.other_user_id,
        username: item.other_user_name,
        avatar: item.other_user_avatar,
      };
      setSelectedChat({ type: "user", data: user });
    }
    setActiveSidebarTab("chats");
  };

  // ── Calling Logic ──
  const startCall = async (type: "audio" | "video") => {
    if (!selectedChat || !currentUser) return;

    const isGroup = selectedChat.type === "group";
    const groupData = selectedChat.data as Group;
    const userData = selectedChat.data as User;

    if (isGroup && !groupData?.id) {
      showToast("Group information is incomplete. Please try again.", "error");
      return;
    }
    if (!socketRef.current?.connected) {
      showToast("Connecting... Please wait a moment.", "error");
      return;
    }

    callLogSentRef.current = false;
    setCall({
      isReceivingCall: false,
      from: selectedChat.data.id,
      name: isGroup ? groupData.name : userData.username,
      signal: null,
      type,
      status: "calling",
      isGroupCall: isGroup,
      groupId: isGroup ? groupData.id : undefined,
      groupName: isGroup ? groupData.name : undefined,
      isGroupCallInitiator: isGroup,
    });

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });
      setStream(mediaStream);
      setTimeout(() => {
        if (myVideo.current) myVideo.current.srcObject = mediaStream;
      }, 100);

      if (isGroup) {
        groupCallRef.current = { groupId: groupData.id };
        setGroupCallParticipantIds([currentUser.id]);
        setCallAccepted(true);
        setCall((p: any) => (p ? { ...p, status: "connected" } : null));
        socketRef.current?.emit("start_group_call", {
          groupId: groupData.id,
          type,
          groupName: groupData.name || "Group",
        });
        return;
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: mediaStream,
      });
      peer.on("signal", (data) =>
        socketRef.current?.emit("call_user", {
          to: selectedChat.data.id,
          from: currentUser.id,
          signal: data,
          type,
        }),
      );
      peer.on("stream", (s) => {
        setUserStream(s);
        if (userVideo.current) userVideo.current.srcObject = s;
      });
      peer.on("error", (err) => {
        const msg = String(err?.message || err || "");
        if (msg.includes("Close") || msg.includes("Abort") || msg.includes("closed")) return;
        console.error("Peer error:", err);
      });
      peer.on("close", () => {
        if (isSwitchingToGroupRef.current) return;
        leaveCall();
      });
      connectionRef.current = peer;
    } catch (err) {
      console.error("Failed to get media stream:", err);
      showToast("Could not access camera/microphone. Please check permissions.", "error");
      setCall(null);
    }
  };

  const answerCall = async () => {
    if (!call || !currentUser) return;
    callLogSentRef.current = false;
    setCallAccepted(true);
    setCall((prev: any) => (prev ? { ...prev, status: "connected" } : null));
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: call.type === "video",
        audio: true,
      });
      setStream(mediaStream);
      setTimeout(() => {
        if (myVideo.current) myVideo.current.srcObject = mediaStream;
      }, 100);

      if (call.isGroupCall && call.groupId) {
        groupCallRef.current = { groupId: call.groupId };
        setGroupCallParticipantIds([currentUser.id]);
        fetchCallGroupMembers(call.groupId); // Ensure joiner has Add participant list immediately
        socketRef.current?.emit("join_group_call", { groupId: call.groupId });
        return;
      }

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: mediaStream,
      });
      peer.on("signal", (data) =>
        socketRef.current?.emit("answer_call", { to: call.from, signal: data }),
      );
      peer.on("stream", (s) => {
        setUserStream(s);
        if (userVideo.current) userVideo.current.srcObject = s;
      });
      peer.on("error", (err) => {
        const msg = String(err?.message || err || "");
        if (msg.includes("Close") || msg.includes("Abort") || msg.includes("closed")) return;
        console.error("Peer error (answer):", err);
      });
      peer.on("close", () => {
        if (isSwitchingToGroupRef.current) return;
        leaveCall();
      });
      peer.signal(call.signal);
      connectionRef.current = peer;
    } catch (err) {
      console.error("Failed to answer call:", err);
      showToast("Could not access camera/microphone.", "error");
      setCall(null);
    }
  };

  const logCallMessage = (
    kind: "completed" | "declined" | "missed" | "cancelled",
  ) => {
    if (!currentUser || !callRef.current || !callRef.current.from) return;
    if (callLogSentRef.current) return;
    const peerId = callRef.current.from;
    const isCaller = !callRef.current.isReceivingCall;
    const direction = (isCaller ? "outgoing" : "incoming") as "outgoing" | "incoming";
    const payload = {
      t: callRef.current.type,
      k: kind,
      d: direction,
      dur: callDurationRef.current,
    };
    socketRef.current?.emit("send_message", {
      senderId: currentUser.id,
      receiverId: peerId,
      type: "call",
      content: JSON.stringify(payload),
    });
    callLogSentRef.current = true;

    const callerId = isCaller ? currentUser.id : peerId;
    const calleeId = isCaller ? peerId : currentUser.id;
    authFetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callerId,
        calleeId,
        type: callRef.current.type,
        status: kind,
        duration: callDurationRef.current,
      }),
    }).then(() => fetchCalls()).catch((e) => console.error("Failed to log call:", e));
  };

  const logGroupCallMessage = (
    kind: "completed" | "declined" | "missed" | "cancelled",
    groupId: string,
  ) => {
    if (!currentUser || !callRef.current || callLogSentRef.current) return;
    const isCaller = !callRef.current.isReceivingCall;
    const direction = (isCaller ? "outgoing" : "incoming") as "outgoing" | "incoming";
    const payload = {
      t: callRef.current.type,
      k: kind,
      d: direction,
      dur: callDurationRef.current,
    };
    socketRef.current?.emit("send_message", {
      senderId: currentUser.id,
      groupId,
      type: "call",
      content: JSON.stringify(payload),
    });
    callLogSentRef.current = true;

    // Log group call to call list for ALL participants (so everyone sees it in their history)
    if (callRef.current.isGroupCallInitiator) {
      const allParticipantIds = Array.from(new Set([currentUser.id, ...groupCallParticipantIds]));
      authFetch("/api/calls/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          groupName: callRef.current.groupName || "Group",
          participantIds: allParticipantIds,
          type: callRef.current.type,
          status: kind,
          duration: callDurationRef.current,
        }),
      }).then(() => fetchCalls()).catch((e) => console.error("Failed to log group call:", e));
    }
  };

  const leaveCall = () => {
    setDocumentTitle("WorkChat");
    const current = callRef.current;
    const isGroupCall = current?.isGroupCall && current?.groupId;

    if (current) {
      if (isGroupCall) {
        if (current.isGroupCallInitiator && !callLogSentRef.current) {
          const wasConnected = callAcceptedRef.current && (current.status === "connected" || callDurationRef.current > 0);
          if (wasConnected) {
            logGroupCallMessage("completed", current.groupId!);
          } else {
            logGroupCallMessage("cancelled", current.groupId!);
          }
        }
        socketRef.current?.emit("leave_group_call", { groupId: current.groupId });
        groupConnectionRef.current.forEach((p) => {
          try { p.destroy(); } catch { /* ignore */ }
        });
        groupConnectionRef.current.clear();
        setGroupRemoteStreams({});
        setGroupCallParticipantIds([]);
        groupCallRef.current = null;
      } else {
        socketRef.current?.emit("end_call", { to: current.from });
      }
    }

    if (current && !isGroupCall && !callLogSentRef.current) {
      const wasConnected = callAcceptedRef.current && (current.status === "connected" || callDurationRef.current > 0);
      if (wasConnected) {
        logCallMessage("completed");
      } else {
        logCallMessage("cancelled");
      }
    }

    setCall((prev: any) =>
      prev
        ? { ...prev, status: "connected", name: prev.name + " (Call Ended)" }
        : null,
    );
    setTimeout(async () => {
      setCallEnded(true);
      // Stop recording if active (save first)
      if (recorderRef.current) {
        try {
          await stopAndSaveRecording();
        } catch {}
      }
      setIsRecording(false);
      // Stop streams first (before destroying peer) to avoid "Close called" console errors
      stopScreenStream();
      stopMediaStream();
      const peer = connectionRef.current;
      connectionRef.current = null;
      try {
        peer?.destroy();
      } catch {
        // ignore
      }
      setCall(null);
      setUserStream(null);
      setCallAccepted(false);
      setCallEnded(false);
      setCallMinimized(false);
      setIsMuted(false);
      setIsVideoOff(false);
    }, 1000);
  };

  const rejectCall = () => {
    const current = callRef.current;
    if (current) {
      if (!current.isGroupCall) {
        socketRef.current?.emit("reject_call", { to: current.from });
        if (!callLogSentRef.current) logCallMessage("declined");
      } else {
        groupCallRef.current = null;
      }
    }
    connectionRef.current = null;
    stopScreenStream();
    stopMediaStream();
    setCall(null);
    setCallMinimized(false);
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      const nextOff = !isVideoOff;
      setIsVideoOff(nextOff);
      if (callRef.current?.isGroupCall && callRef.current?.groupId && groupCallRef.current) {
        socketRef.current?.emit(nextOff ? "group_call_video_off" : "group_call_video_on", {
          groupId: callRef.current.groupId,
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    const myStream = streamRef.current;
    const current = callRef.current;
    if (!myStream || !current || current.type !== "video") return;
    if (isScreenSharing) {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const cameraTrack = cameraStream.getVideoTracks()[0];
        const screenTrack = myStream.getVideoTracks()[0];
        if (!screenTrack || !cameraTrack) return;
        // Call replaceTrack BEFORE modifying stream (simple-peer requires stream that originally had the track)
        if (current.isGroupCall && current.groupId) {
          groupConnectionRef.current.forEach((peer) => {
            try { peer.replaceTrack(screenTrack, cameraTrack, myStream); } catch {}
          });
        } else {
          const peer = connectionRef.current;
          if (peer) try { peer.replaceTrack(screenTrack, cameraTrack, myStream); } catch {}
        }
        myStream.removeTrack(screenTrack);
        myStream.addTrack(cameraTrack);
        cameraStream.getTracks().forEach((t) => { if (t !== cameraTrack) safeStopTrack(t); });
        stopScreenStream();
      } catch (err) {
        console.error("Failed to stop screen share:", err);
        showToast("Could not switch back to camera.", "error");
      }
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as MediaTrackConstraints,
          audio: false,
        });
        const screenTrack = displayStream.getVideoTracks()[0];
        const oldVideoTrack = myStream.getVideoTracks()[0];
        if (!oldVideoTrack) return;
        screenStreamRef.current = displayStream;
        screenTrack.onended = () => toggleScreenShare();
        // Call replaceTrack BEFORE modifying stream (simple-peer requires stream that originally had the track)
        if (current.isGroupCall && current.groupId) {
          groupConnectionRef.current.forEach((peer) => {
            try { peer.replaceTrack(oldVideoTrack, screenTrack, myStream); } catch {}
          });
        } else {
          const peer = connectionRef.current;
          if (peer) try { peer.replaceTrack(oldVideoTrack, screenTrack, myStream); } catch {}
        }
        myStream.removeTrack(oldVideoTrack);
        myStream.addTrack(screenTrack);
        safeStopTrack(oldVideoTrack);
        setIsScreenSharing(true);
      } catch (err) {
        if ((err as Error).name !== "NotAllowedError") console.error("Screen share failed:", err);
        showToast("Screen sharing was denied or is not available.", "error");
      }
    }
  };

  const isScreenShareTrack = (track: MediaStreamTrack): boolean => {
    try {
      const settings = track.getSettings();
      const ds = (settings as { displaySurface?: string }).displaySurface;
      return ds === "monitor" || ds === "window" || ds === "browser";
    } catch {
      return false;
    }
  };

  const createMixedStream = (
    myStream: MediaStream,
    remoteStreams: MediaStream | Record<string, MediaStream>,
    callType: "audio" | "video",
    isGroup: boolean,
    opts?: { isScreenSharing?: boolean; groupParticipantIds?: string[]; currentUserId?: string }
  ): { stream: MediaStream; cleanup: () => void } => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();

    const addAudioFromStream = (s: MediaStream) => {
      const track = s.getAudioTracks()[0];
      if (track) {
        const src = ctx.createMediaStreamSource(new MediaStream([track]));
        src.connect(dest);
      }
    };

    addAudioFromStream(myStream);
    if (isGroup && typeof remoteStreams === "object" && !(remoteStreams instanceof MediaStream)) {
      Object.values(remoteStreams).forEach(addAudioFromStream);
    } else if (!isGroup && remoteStreams instanceof MediaStream) {
      addAudioFromStream(remoteStreams);
    }

    const mixedStream = new MediaStream();
    dest.stream.getAudioTracks().forEach((t) => mixedStream.addTrack(t));

    let compositeCleanup: (() => void) | null = null;

    if (callType === "video") {
      const W = 1280;
      const H = 720;
      const PIP_W = 200;
      const PIP_H = 150;
      const PIP_MARGIN = 16;
      const PIP_X = W - PIP_W - PIP_MARGIN;
      const PIP_Y = H - PIP_H - PIP_MARGIN;
      const MAIN_W = W;
      const MAIN_H = H;

      const participantIds = opts?.groupParticipantIds ?? [];
      const currentUserId = opts?.currentUserId ?? "";
      const allStreams: { id: string; stream: MediaStream; isSelf: boolean }[] = [];
      if (currentUserId) allStreams.push({ id: currentUserId, stream: myStream, isSelf: true });
      if (isGroup && typeof remoteStreams === "object" && !(remoteStreams instanceof MediaStream)) {
        participantIds.forEach((id) => {
          if (id !== currentUserId && remoteStreams[id])
            allStreams.push({ id, stream: remoteStreams[id], isSelf: false });
        });
      } else if (!isGroup && remoteStreams instanceof MediaStream) {
        allStreams.push({ id: "remote", stream: remoteStreams, isSelf: false });
      }

      const streamsWithVideo = allStreams.filter((s) => s.stream.getVideoTracks().length > 0);
      const selfEntry = allStreams.find((s) => s.isSelf);
      const selfVideo = selfEntry?.stream.getVideoTracks()[0] ?? null;
      const othersWithVideo = streamsWithVideo.filter((s) => !s.isSelf);

      if (streamsWithVideo.length === 0) {
        const fallback = myStream.getVideoTracks()[0];
        if (fallback) mixedStream.addTrack(fallback);
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) {
          const first = streamsWithVideo.find((s) => isScreenShareTrack(s.stream.getVideoTracks()[0])) ?? streamsWithVideo[0];
          mixedStream.addTrack(first.stream.getVideoTracks()[0]);
        } else {
          const screenEntry = streamsWithVideo.find((s) => isScreenShareTrack(s.stream.getVideoTracks()[0]));
          const participantEntries = othersWithVideo.filter((s) => s.id !== screenEntry?.id);
          const TILE_H = 90;
          const TILE_GAP = 6;
          const MAX_TILES = 6;
          const hasScreenShare = !!screenEntry;

          const createVideo = (str: MediaStream) => {
            const v = document.createElement("video");
            v.srcObject = str;
            v.muted = true;
            v.playsInline = true;
            v.autoplay = true;
            v.play().catch(() => {});
            return v;
          };

          const screenVideo = screenEntry ? createVideo(screenEntry.stream) : null;
          const participantVideos = participantEntries.slice(0, MAX_TILES).map((e) => createVideo(e.stream));
          const selfVid = selfVideo ? createVideo(myStream) : null;

          const stripHeight = hasScreenShare && participantVideos.length > 0 ? TILE_H + TILE_GAP : 0;
          const mainW = MAIN_W;
          const mainH = MAIN_H - stripHeight;

          const isLocalSharer = hasScreenShare && !!screenEntry?.isSelf;
          const cursorState = { x: 0, y: 0, visible: false };
          const clicks: { x: number; y: number; t: number }[] = [];
          const CLICK_DURATION_MS = 400;

          const onMouseMove = (e: MouseEvent) => {
            const vw = window.innerWidth || 1;
            const vh = window.innerHeight || 1;
            cursorState.x = Math.max(0, Math.min(mainW, (e.clientX / vw) * mainW));
            cursorState.y = Math.max(0, Math.min(mainH, (e.clientY / vh) * mainH));
            cursorState.visible = true;
          };
          const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            const vw = window.innerWidth || 1;
            const vh = window.innerHeight || 1;
            clicks.push({
              x: Math.max(0, Math.min(mainW, (e.clientX / vw) * mainW)),
              y: Math.max(0, Math.min(mainH, (e.clientY / vh) * mainH)),
              t: performance.now(),
            });
          };
          if (isLocalSharer) {
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mousedown", onMouseDown);
          }

          const drawCursor = (cx: number, cy: number) => {
            ctx2d.save();
            ctx2d.translate(cx, cy);
            ctx2d.fillStyle = "#fff";
            ctx2d.strokeStyle = "#000";
            ctx2d.lineWidth = 1.5;
            ctx2d.shadowColor = "rgba(0,0,0,0.5)";
            ctx2d.shadowBlur = 4;
            ctx2d.beginPath();
            ctx2d.moveTo(0, 0);
            ctx2d.lineTo(12, 4);
            ctx2d.lineTo(7, 4);
            ctx2d.lineTo(7, 14);
            ctx2d.lineTo(4, 14);
            ctx2d.lineTo(4, 4);
            ctx2d.lineTo(0, 4);
            ctx2d.closePath();
            ctx2d.stroke();
            ctx2d.fill();
            ctx2d.restore();
          };

          let rafId: number;
          const draw = () => {
            ctx2d.fillStyle = "#111827";
            ctx2d.fillRect(0, 0, W, H);

            if (hasScreenShare && screenVideo && screenVideo.readyState >= 2) {
              try {
                ctx2d.drawImage(screenVideo, 0, 0, mainW, mainH);
              } catch {}
            }

            if (isLocalSharer) {
              const now = performance.now();
              while (clicks.length > 0 && now - clicks[0].t > CLICK_DURATION_MS) clicks.shift();
              clicks.forEach((c) => {
                const age = now - c.t;
                const alpha = Math.max(0, 1 - age / CLICK_DURATION_MS);
                const r = 12 + (1 - alpha) * 8;
                ctx2d.beginPath();
                ctx2d.arc(c.x, c.y, r, 0, Math.PI * 2);
                ctx2d.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.9})`;
                ctx2d.lineWidth = 3;
                ctx2d.stroke();
              });
            }

            if (!hasScreenShare && participantVideos.length > 0) {
              const n = participantVideos.length;
              const cols = n <= 2 ? n : 2;
              const rows = Math.ceil(n / cols);
              const cellW = mainW / cols;
              const cellH = mainH / rows;
              participantVideos.forEach((v, i) => {
                if (v.readyState >= 2) {
                  try {
                    const dx = (i % cols) * cellW;
                    const dy = Math.floor(i / cols) * cellH;
                    ctx2d.fillStyle = "#1f2937";
                    ctx2d.fillRect(dx, dy, cellW, cellH);
                    ctx2d.drawImage(v, dx, dy, cellW, cellH);
                  } catch {}
                }
              });
            }

            if (hasScreenShare && participantVideos.length > 0) {
              const tileW = Math.floor((mainW - TILE_GAP * (participantVideos.length - 1)) / participantVideos.length);
              participantVideos.forEach((v, i) => {
                if (v.readyState >= 2) {
                  try {
                    const tx = i * (tileW + TILE_GAP);
                    const ty = mainH + TILE_GAP;
                    ctx2d.fillStyle = "#1f2937";
                    ctx2d.fillRect(tx, ty, tileW, TILE_H);
                    ctx2d.strokeStyle = "#374151";
                    ctx2d.lineWidth = 1;
                    ctx2d.strokeRect(tx, ty, tileW, TILE_H);
                    ctx2d.drawImage(v, tx, ty, tileW, TILE_H);
                  } catch {}
                }
              });
            }

            if (selfVid && selfVid.readyState >= 2) {
              const r = 10;
              ctx2d.save();
              ctx2d.beginPath();
              ctx2d.moveTo(PIP_X + r, PIP_Y);
              ctx2d.lineTo(PIP_X + PIP_W - r, PIP_Y);
              ctx2d.quadraticCurveTo(PIP_X + PIP_W, PIP_Y, PIP_X + PIP_W, PIP_Y + r);
              ctx2d.lineTo(PIP_X + PIP_W, PIP_Y + PIP_H - r);
              ctx2d.quadraticCurveTo(PIP_X + PIP_W, PIP_Y + PIP_H, PIP_X + PIP_W - r, PIP_Y + PIP_H);
              ctx2d.lineTo(PIP_X + r, PIP_Y + PIP_H);
              ctx2d.quadraticCurveTo(PIP_X, PIP_Y + PIP_H, PIP_X, PIP_Y + PIP_H - r);
              ctx2d.lineTo(PIP_X, PIP_Y + r);
              ctx2d.quadraticCurveTo(PIP_X, PIP_Y, PIP_X + r, PIP_Y);
              ctx2d.closePath();
              ctx2d.clip();
              try {
                ctx2d.drawImage(selfVid, PIP_X, PIP_Y, PIP_W, PIP_H);
              } catch {}
              ctx2d.restore();
              ctx2d.strokeStyle = "rgba(255,255,255,0.4)";
              ctx2d.lineWidth = 2;
              ctx2d.strokeRect(PIP_X, PIP_Y, PIP_W, PIP_H);
              ctx2d.fillStyle = "rgba(0,0,0,0.5)";
              ctx2d.font = "bold 12px system-ui,-apple-system,sans-serif";
              ctx2d.fillText("You", PIP_X + 10, PIP_Y + PIP_H - 12);
            }

            if (isLocalSharer && cursorState.visible) {
              drawCursor(cursorState.x, cursorState.y);
            }

            rafId = requestAnimationFrame(draw);
          };
          draw();
          const captureStream = canvas.captureStream(30);
          captureStream.getVideoTracks().forEach((t) => mixedStream.addTrack(t));
          compositeCleanup = () => {
            cancelAnimationFrame(rafId);
            if (isLocalSharer) {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mousedown", onMouseDown);
            }
            [screenVideo, ...participantVideos, selfVid].forEach((v) => {
              if (v) v.srcObject = null;
            });
          };
        }
      }
    }

    const cleanup = () => {
      compositeCleanup?.();
      mixedStream.getTracks().forEach(safeStopTrack);
      ctx.close().catch(() => {});
      audioContextRef.current = null;
    };

    return { stream: mixedStream, cleanup };
  };

  const stopAndSaveRecording = async (): Promise<void> => {
    const data = recorderRef.current;
    if (!data?.recorder || data.recorder.state === "inactive") {
      recordCleanupRef.current?.();
      recordCleanupRef.current = null;
      recorderRef.current = null;
      mixedStreamRef.current?.getTracks().forEach(safeStopTrack);
      mixedStreamRef.current = null;
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
      return;
    }
    const { recorder, chunks, fileWriter } = data;
    await new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = (e) => reject((e as ErrorEvent).error);
      recorder.stop();
    });
    if (fileWriter) {
      try {
        await fileWriter.close();
      } catch (e) {
        console.error("Failed to close recording file:", e);
      }
    } else {  
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `call-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    recordCleanupRef.current?.();
    recordCleanupRef.current = null;
    recorderRef.current = null;
    mixedStreamRef.current?.getTracks().forEach(safeStopTrack);
    mixedStreamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  };

  const toggleRecording = async () => {
    const myStream = streamRef.current;
    const current = callRef.current;
    if (!myStream || !current || current.status !== "connected") return;

    if (isRecording) {
      try {
        await stopAndSaveRecording();
        showToast("Recording saved", "success");
      } catch (err) {
        console.error("Stop recording failed:", err);
        showToast("Failed to save recording", "error");
      }
      setIsRecording(false);
    } else {
      try {
        const isGroup = !!(current.isGroupCall && current.groupId);
        const remoteStreams = isGroup ? groupRemoteStreams : userStream;
        const { stream: mixedStream, cleanup } = createMixedStream(
          myStream,
          remoteStreams ?? (isGroup ? {} : new MediaStream()),
          current.type,
          isGroup,
          {
            isScreenSharing,
            groupParticipantIds: groupCallParticipantIds,
            currentUserId: currentUser?.id ?? "",
          }
        );
        mixedStreamRef.current = mixedStream;
        recordCleanupRef.current = cleanup;

        const isVideo = current.type === "video";
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "";
        const audioMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/webm";
        const options: MediaRecorderOptions = {
          audioBitsPerSecond: 128000,
          videoBitsPerSecond: isVideo ? 2500000 : undefined,
          mimeType: isVideo ? (mimeType || "video/webm") : audioMimeType,
        };
        const recorder = new MediaRecorder(mixedStream, options);
        const chunks: Blob[] = [];
        let fileWriter: WritableStreamDefaultWriter<Blob> | undefined;
        let fileHandle: FileSystemFileHandle | undefined;

        if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
          try {
            const suggestedName = `call-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
            const handle = await (window as any).showSaveFilePicker({
              suggestedName,
              types: [{ description: "WebM video", accept: { "video/webm": [".webm"] } }],
            });
            fileHandle = handle;
            const writable = await handle.createWritable();
            fileWriter = writable.getWriter();
          } catch (e) {
            if ((e as Error).name !== "AbortError") console.warn("File picker failed, using in-memory:", e);
          }
        }

        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0) {
            if (fileWriter) {
              try {
                await fileWriter.write(e.data);
              } catch (err) {
                console.error("Write failed:", err);
              }
            } else {
              chunks.push(e.data);
            }
          }
        };
        recorderRef.current = { recorder, chunks, fileWriter, fileHandle };
        recorder.start(1000);
        setIsRecording(true);
        showToast(fileWriter ? "Recording (no time limit)" : "Recording started", "success");
      } catch (err) {
        console.error("Start recording failed:", err);
        showToast("Could not start recording", "error");
      }
    }
  };

  // ── Selection Actions ──
  const toggleMsgSelect = (msgId: number | string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedMsgIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedMsgIds.size === 0) return;
    const myMsgs = messages.filter(
      (m) => selectedMsgIds.has(m.id) && m.sender_id === currentUser?.id,
    );
    const otherMsgs = messages.filter(
      (m) => selectedMsgIds.has(m.id) && m.sender_id !== currentUser?.id,
    );
    if (!window.confirm(`Delete ${selectedMsgIds.size} message(s)?`)) return;
    myMsgs.forEach((m) => socketRef.current?.emit("delete_message", { messageId: m.id, mode: "everyone" }));
    otherMsgs.forEach((m) => socketRef.current?.emit("delete_message", { messageId: m.id, mode: "me" }));
    setMessages((prev) => prev.filter((m) => !selectedMsgIds.has(m.id)));
    exitSelectMode();
  };

  const handleCopySelected = () => {
    const selected = messages
      .filter((m) => selectedMsgIds.has(m.id))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    const text = selected
      .map((m) => {
        const name =
          m.sender_id === currentUser?.id
            ? "You"
            : m.sender_name ||
            users.find((u) => u.id === m.sender_id)?.username ||
            "User";
        const time = new Date(m.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        if (m.type === "image") return `[${time}] ${name}: [Image]`;
        if (m.type === "file")
          return `[${time}] ${name}: [File: ${m.file_name}]`;
        return `[${time}] ${name}: ${m.content}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
    exitSelectMode();
  };

  const handleForwardSend = () => {
    if (
      forwardTargets.length === 0 ||
      selectedMsgIds.size === 0 ||
      !currentUser
    )
      return;
    const selected = messages
      .filter((m) => selectedMsgIds.has(m.id))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    for (const targetId of forwardTargets) {
      const isGroup = groups.some((g) => g.id === targetId);
      for (const msg of selected) {
        const fwd: any = {
          senderId: currentUser.id,
          content: msg.content,
          type: msg.type,
          fileName: msg.file_name || undefined,
        };
        if (isGroup) fwd.groupId = targetId;
        else fwd.receiverId = targetId;
        socketRef.current?.emit("send_message", fwd);
      }
    }
    setShowForwardModal(false);
    exitSelectMode();
  };

  const deleteMessage = (id: number | string, mode: "everyone" | "me") => {
    const label = mode === "everyone" ? "Delete this message for everyone?" : "Delete this message for you?";
    if (window.confirm(label)) {
      socketRef.current?.emit("delete_message", { messageId: String(id), mode });
    }
  };

  const editMessage = (id: number | string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setMessages((prev) => prev.map((m) => (String(m.id) === String(id) ? { ...m, content: trimmed, edited_at: new Date().toISOString() } : m)));
    socketRef.current?.emit("edit_message", { messageId: String(id), content: trimmed });
  };

  const addReaction = (id: number | string, emoji: string) => {
    const msgId = String(id);
    const uid = currentUser?.id ?? "";
    if (!uid) return;
    setMessages((prev) => prev.map((m) => {
      if (String(m.id) !== msgId) return m;
      const reactions = m.reactions || [];
      const withoutUser = reactions.map((r) => {
        const newUserIds = r.userIds.filter((x) => x !== uid);
        return { ...r, userIds: newUserIds, count: newUserIds.length };
      }).filter((r) => r.count > 0);
      const forEmoji = withoutUser.find((r) => r.emoji === emoji);
      const newUserIds = forEmoji ? [...forEmoji.userIds, uid] : [uid];
      const updated = [...withoutUser.filter((r) => r.emoji !== emoji), { emoji, count: newUserIds.length, userIds: newUserIds }];
      return { ...m, reactions: updated };
    }));
    socketRef.current?.emit("add_reaction", { messageId: msgId, emoji });
  };

  const removeReaction = (id: number | string) => {
    const msgId = String(id);
    const uid = currentUser?.id ?? "";
    setMessages((prev) => prev.map((m) => {
      if (String(m.id) !== msgId) return m;
      const reactions = (m.reactions || []).map((r) => (!r.userIds.includes(uid) ? r : { ...r, userIds: r.userIds.filter((x) => x !== uid), count: r.userIds.filter((x) => x !== uid).length })).filter((r) => r.count > 0);
      return { ...m, reactions };
    }));
    socketRef.current?.emit("remove_reaction", { messageId: msgId });
  };

  const fetchReadInfo = async (messageId: number | string) => {
    try {
      const res = await authFetch(`/api/message-reads/${String(messageId)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  };

  const fetchReactionReactors = async (messageId: number | string, emoji: string) => {
    try {
      const res = await authFetch(`/api/message-reads/${String(messageId)}/reaction-reactors?emoji=${encodeURIComponent(emoji)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  };
  const clearChat = () => {
    if (window.confirm("Clear all messages in this chat?")) {
      setMessages([]);
      setShowChatMenu(false);
    }
  };

  const openProfile = () => {
    if (!currentUser) return;
    setEditUsername(currentUser.username);
    setEditAvatar(currentUser.avatar);
    setEditAbout(currentUser.about || "Hey there! I am using WorkChat.");
    setShowProfileSettings(true);
  };

  const openChatInfo = () => {
    setShowChatInfo(true);
    if (selectedChat?.type === "group") fetchGroupMembers(selectedChat.data.id);
  };

  const handleAddGroupMembers = async (groupId: string, memberIds: string[]) => {
    try {
      const res = await authFetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ members: memberIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to add members", "error");
        return;
      }
      if (data.added && data.added.length > 0) {
        const group = selectedChat?.data as Group;
        socketRef.current?.emit("add_group_members", {
          groupId,
          members: data.added,
          group: { id: group.id, name: group.name, avatar: group.avatar, created_by: group.created_by, created_at: group.created_at },
        });
      }
      fetchGroupMembers(groupId);
    } catch (err) {
      console.error("Failed to add members:", err);
      showToast("Failed to add members. Please try again.", "error");
    }
  };

  const handleExitGroup = async (groupId: string) => {
    if (!currentUser) return;
    try {
      const res = await authFetch(`/api/groups/${groupId}/leave`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to exit group", "error");
        return;
      }
      socketRef.current?.emit("leave_group", { groupId, userId: currentUser.id });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setGroupConversations((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setSelectedChat(null);
      setShowChatInfo(false);
    } catch (err) {
      console.error("Failed to exit group:", err);
      showToast("Failed to exit group.", "error");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const res = await authFetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to delete group", "error");
        return;
      }
      socketRef.current?.emit("delete_group", { groupId });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setGroupConversations((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setSelectedChat(null);
      setShowChatInfo(false);
    } catch (err) {
      console.error("Failed to delete group:", err);
      showToast("Failed to delete group.", "error");
    }
  };

  const filteredMessages = Array.isArray(messages)
    ? messages
        .filter((m) =>
      m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()),
    )
        .filter((m, i, arr) => arr.findIndex((x) => String(x.id) === String(m.id)) === i)
    : [];

  // ── Render ──
  if (!currentUser) {
    return (
      <LoginPage
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        setLoginError={setLoginError}
        loginLoading={loginLoading}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <>
      <LoginCelebration show={showLoginCelebration} onComplete={() => setShowLoginCelebration(false)} />
    <AppLayout
        currentUser={currentUser}
        isConnected={isConnected}
        users={users}
        groups={groups}
        conversations={conversations}
        groupConversations={groupConversations}
        selectedChatId={selectedChat?.data.id || null}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      onSelectChat={(chat) => setSelectedChat(chat)}
        onLogout={handleLogout}
        showNewChat={showNewChat}
        setShowNewChat={setShowNewChat}
        showCreateGroup={showCreateGroup}
        setShowCreateGroup={setShowCreateGroup}
        groupName={groupName}
        setGroupName={setGroupName}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        onCreateGroup={handleCreateGroup}
        showProfileSettings={showProfileSettings}
        setShowProfileSettings={setShowProfileSettings}
        editUsername={editUsername}
        setEditUsername={setEditUsername}
        editAvatar={editAvatar}
        setEditAvatar={setEditAvatar}
        editAbout={editAbout}
        setEditAbout={setEditAbout}
        onUpdateProfile={handleUpdateProfile}
        onOpenProfile={openProfile}
        onAvatarUpload={handleAvatarUpload}
        activeSidebarTab={activeSidebarTab}
        setActiveSidebarTab={setActiveSidebarTab}
        callLogs={callLogs}
        statuses={statuses}
        onSelectCall={handleSelectCall}
        onAddStatus={() => setShowAddStatusModal(true)}
        onSelectStatus={(s: StatusItem) => {
          const userStatuses = statuses.filter((st) => st.user_id === s.user_id);
          const idx = userStatuses.findIndex((st) => st.id === s.id);
          setSelectedStatusForView({ statuses: userStatuses, index: idx >= 0 ? idx : 0 });
        }}
        hasUnseenStatus={hasUnseenStatus}
        onOpenSettings={() => setShowSettings(true)}
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
    >
      <ChatSection
        showSettings={showSettings}
        selectedChat={selectedChat}
            currentUser={currentUser}
        onBackFromSettings={() => setShowSettings(false)}
            onOpenEditProfile={() => {
              setShowSettings(false);
              setShowProfileSettings(true);
            }}
        authFetch={authFetch}
        onCloseProfile={() => setShowProfileSettings(false)}
        onCloseNewChat={() => setShowNewChat(false)}
        onCloseCreateGroup={() => setShowCreateGroup(false)}
        chatAreaProps={{
          users,groupMembers,
          filteredMessages,
          inputValue,
          setInputValue,
          replyTo,
          setReplyTo,
          showEmojiPicker,
          setShowEmojiPicker,
          uploadingFile,
          selectMode,
          selectedMsgIds,
          showChatSearch,
          chatSearchQuery,
          showChatMenu,
          loadingMore,
          chatScrollRef,
          messagesEndRef,
          inputRef,
          onScroll: () => {
            handleChatScroll();
            trackScrollPosition();
          },
          onToggleSelect: toggleMsgSelect,
          onDoubleClick: (id) => {
                          if (!selectMode) {
                            setSelectMode(true);
                            setSelectedMsgIds(new Set([id]));
                          }
          },
          onReply: (m) => {
                          setReplyTo(m);
                          inputRef.current?.focus();
          },
          onDelete: deleteMessage,
          onEdit: editMessage,
          onAddReaction: addReaction,
          onRemoveReaction: removeReaction,
          onFetchReadInfo: fetchReadInfo,
          onFetchReactionReactors: fetchReactionReactors,
          onSendMessage: handleSendMessage,
          onFileUpload: handleFileUpload,
          onVoiceSend: handleVoiceSend,
          onExitSelectMode: exitSelectMode,
          onCopySelected: handleCopySelected,
          onDeleteSelected: handleDeleteSelected,
          onForward: () => {
            setForwardTargets([]);
            setShowForwardModal(true);
          },
          onOpenInfo: openChatInfo,
          onStartCall: startCall,
          setShowChatSearch: setShowChatSearch,
          setChatSearchQuery: setChatSearchQuery,
          setShowChatMenu: setShowChatMenu,
          onSelectMessages: () => setSelectMode(true),
          onClearChat: clearChat,
        }}
      />

      <ModalsContainer
        call={call}
        callAccepted={callAccepted}
        callDuration={callDuration}
        stream={stream}
        userStream={userStream}
        groupRemoteStreams={groupRemoteStreams}
        groupCallParticipantIds={groupCallParticipantIds}
        groupMembers={call?.isGroupCall && call?.groupId ? callGroupMembers : groupMembers}
        currentUser={currentUser}
        users={users}
        remoteVideoOff={remoteVideoOff}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        myVideoRef={myVideo}
        userVideoRef={userVideo}
        onAnswerCall={answerCall}
        onRejectCall={rejectCall}
        onLeaveCall={leaveCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleRecording={toggleRecording}
        callMinimized={callMinimized}
        onOpenChat={() => setCallMinimized(true)}
        onExpandCall={() => setCallMinimized(false)}
        onInviteToCall={(userId) => {
          const gid = call?.groupId || groupCallRef.current?.groupId;
          if (gid) socketRef.current?.emit("invite_to_group_call", { groupId: gid, userId });
        }}
        onAddTo1_1Call={(userIdOrIds) => {
          const other = call?.from;
          if (!other || !call?.type) return;
          const ids = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
          if (ids.length === 0) return;
          if (ids.length === 1) {
            socketRef.current?.emit("add_to_1_1_call", { otherParticipantId: other, addUserId: ids[0], type: call.type });
          } else {
            socketRef.current?.emit("add_to_1_1_call", { otherParticipantId: other, addUserIds: ids, type: call.type });
          }
        }}
        showChatInfo={showChatInfo}
        selectedChat={selectedChat}
        messages={messages}
        onCloseChatInfo={() => setShowChatInfo(false)}
        onAddGroupMembers={handleAddGroupMembers}
        onExitGroup={handleExitGroup}
        onDeleteGroup={handleDeleteGroup}
        onRemoveMember={(groupId, memberId) => {
          socketRef.current?.emit("kick_member", { groupId, memberId });
        }}
        showForwardModal={showForwardModal}
        selectedMsgCount={selectedMsgIds.size}
        forwardTargets={forwardTargets}
        setForwardTargets={setForwardTargets}
        groups={groups}
        onCloseForwardModal={() => setShowForwardModal(false)}
        onForwardSend={handleForwardSend}
        showAddStatusModal={showAddStatusModal}
        onCloseAddStatusModal={() => setShowAddStatusModal(false)}
        onCreateStatus={handleCreateStatus}
        selectedStatusForView={selectedStatusForView}
          authFetch={authFetch}
        fetchStatuses={fetchStatuses}
        onCloseStatusView={() => {
            setSelectedStatusForView(null);
            fetchStatuses();
          }}
        onDeleteStatus={async (statusId) => {
            const res = await authFetch(`/api/status/${statusId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete status");
            fetchStatuses();
          const remaining = selectedStatusForView!.statuses.filter((s) => s.id !== statusId);
            if (remaining.length === 0) setSelectedStatusForView(null);
          else setSelectedStatusForView({ statuses: remaining, index: Math.min(selectedStatusForView!.index, remaining.length - 1) });
        }}
        avatarCropImageUrl={avatarCropImageUrl}
        onAvatarCrop={async (blob) => {
            await doAvatarUpload(blob);
          if (avatarCropImageUrl?.startsWith("blob:")) URL.revokeObjectURL(avatarCropImageUrl);
            setAvatarCropImageUrl(null);
          }}
        onAvatarCropCancel={() => {
          if (avatarCropImageUrl?.startsWith("blob:")) URL.revokeObjectURL(avatarCropImageUrl);
            setAvatarCropImageUrl(null);
          }}
        />
    </AppLayout>
    </>
  );
}
