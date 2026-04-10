"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, LogOut, Plus, Users, ArrowLeft, X, MessageCircle, Phone, Circle, Settings, Video, Image, Film, Mic, File as FileIcon, LayoutDashboard } from "lucide-react";
import { User, Group, CallLogItem, StatusItem } from "@/types";
import { formatChatTime, getLastMessagePreviewWithIcon, type LastMessageIconType } from "@/lib/utils";
import CallsList from "@/components/ui/CallsList";

const LAST_MSG_ICONS: Record<Exclude<LastMessageIconType, "text">, React.ComponentType<{ size?: number; className?: string }>> = {
  "video-call": Video,
  "audio-call": Phone,
  photo: Image,
  video: Film,
  voice: Mic,
  document: FileIcon,
};
import StatusList from "@/components/ui/StatusList";

interface ConvoData {
  last_message: string;
  last_message_time: string;
  last_sender_id: string;
  unread_count: number;
}
interface GroupConvoData extends ConvoData {
  last_sender_name: string;
}

interface Props {
  currentUser: User;
  isConnected: boolean;
  users: User[];
  groups: Group[];
  conversations: Record<string, ConvoData>;
  groupConversations: Record<string, GroupConvoData>;
  selectedChatId: string | null;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSelectChat: (chat: { type: "user" | "group"; data: User | Group }) => void;
  onLogout: () => void;
  showNewChat: boolean;
  setShowNewChat: (v: boolean) => void;
  showCreateGroup: boolean;
  setShowCreateGroup: (v: boolean) => void;
  groupName: string;
  setGroupName: (v: string) => void;
  selectedMembers: string[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>;
  onCreateGroup: () => void;
  showProfileSettings: boolean;
  setShowProfileSettings: (v: boolean) => void;
  editUsername: string;
  setEditUsername: (v: string) => void;
  editAvatar: string;
  setEditAvatar: (v: string) => void;
  editAbout: string;
  setEditAbout: (v: string) => void;
  onUpdateProfile: () => void;
  onOpenProfile: () => void;
  onAvatarUpload: (file: File) => void;
  activeSidebarTab: "chats" | "calls" | "status";
  setActiveSidebarTab: (tab: "chats" | "calls" | "status") => void;
  callLogs: CallLogItem[];
  statuses: StatusItem[];
  onSelectCall: (item: CallLogItem) => void;
  onAddStatus: () => void;
  onSelectStatus: (status: StatusItem) => void;
  hasUnseenStatus: boolean;
  onOpenSettings: () => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
  isAdmin?: boolean;
  onOpenAdminDashboard?: () => void;
}

export default function Sidebar(props: Props) {
  const {
    currentUser,
    isConnected,
    users,
    groups,
    conversations,
    groupConversations,
    selectedChatId,
    searchQuery,
    setSearchQuery,
    onSelectChat,
    onLogout,
    showNewChat,
    setShowNewChat,
    showCreateGroup,
    setShowCreateGroup,
    groupName,
    setGroupName,
    selectedMembers,
    setSelectedMembers,
    onCreateGroup,
    showProfileSettings,
    setShowProfileSettings,
    editUsername,
    setEditUsername,
    editAvatar,
    setEditAvatar,
    editAbout,
    setEditAbout,
    onUpdateProfile,
    onOpenProfile,
    onAvatarUpload,
    activeSidebarTab,
    setActiveSidebarTab,
    callLogs,
    statuses,
    onSelectCall,
    onAddStatus,
    onSelectStatus,
    hasUnseenStatus,
    onOpenSettings,
    showSettings,
    onCloseSettings,
    isAdmin,
    onOpenAdminDashboard,
  } = props;

  const sortedUsers = [...users]
    .filter(
      (u) =>
        conversations[u.id] &&
        u.username.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      const ca = conversations[a.id];
      const cb = conversations[b.id];
      return (
        new Date(cb.last_message_time).getTime() -
        new Date(ca.last_message_time).getTime()
      );
    });

  const filteredGroups = groups
    .filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aTime = groupConversations[a.id]?.last_message_time || "";
      const bTime = groupConversations[b.id]?.last_message_time || "";
      return bTime.localeCompare(aTime);
    });

  const LastMessageIcon = ({ iconType }: { iconType: "video-call" | "audio-call" | "photo" | "video" | "voice" | "document" | "text" }) => {
    const iconClass = "flex-shrink-0 text-gray-500";
    const size = 14;
    switch (iconType) {
      case "video-call": return <Video size={size} className={iconClass} />;
      case "audio-call": return <Phone size={size} className={iconClass} />;
      case "photo": return <Image size={size} className={iconClass} />;
      case "video": return <Film size={size} className={iconClass} />;
      case "voice": return <Mic size={size} className={iconClass} />;
      case "document": return <FileIcon size={size} className={iconClass} />;
      default: return null;
    }
  };

  return (
    <div
      className="w-full max-w-[400px] bg-white border-r border-gray-200 flex flex-col relative z-20"
      onClick={() => { if (showSettings && onCloseSettings) onCloseSettings(); }}
      role="presentation"
    >
      {/* Header */}
      <div className="p-4 bg-[#f0f2f5] flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={onOpenProfile}
        >
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover object-center bg-gray-200"
            />
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
          </div>
          <span className="font-semibold text-gray-700">
            {currentUser.username}
          </span>
        </div>
        <div className="flex gap-4 text-gray-500">
          {isAdmin && onOpenAdminDashboard && (
            <button
              className="hover:text-[#00a884]"
              onClick={(e) => {
                e.stopPropagation();
                onCloseSettings?.();
                onOpenAdminDashboard();
              }}
              title="Admin dashboard"
            >
              <LayoutDashboard size={20} />
            </button>
          )}
          <button
            className="hover:text-gray-700"
            onClick={(e) => { e.stopPropagation(); if (showSettings) onCloseSettings?.(); else onOpenSettings(); }}
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            className="hover:text-gray-700"
            onClick={() => setShowCreateGroup(true)}
            title="Create Group"
          >
            <Users size={20} />
          </button>
          <button
            className="hover:text-gray-700"
            onClick={() => setShowNewChat(true)}
            title="New Chat"
          >
            <Plus size={20} />
          </button>
          <button
            className="hover:text-gray-700"
            onClick={onLogout}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setActiveSidebarTab("chats")}
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeSidebarTab === "chats" ? "text-[#00a884] border-b-2 border-[#00a884]" : "text-gray-500 hover:text-gray-700"}`}
        >
          <MessageCircle size={18} />
          Chats
        </button>
        <button
          type="button"
          onClick={() => setActiveSidebarTab("calls")}
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeSidebarTab === "calls" ? "text-[#00a884] border-b-2 border-[#00a884]" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Phone size={18} />
          Calls
        </button>
        <button
          type="button"
          onClick={() => setActiveSidebarTab("status")}
          className={`relative flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeSidebarTab === "status" ? "text-[#00a884] border-b-2 border-[#00a884]" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Circle size={18} />
          Status
          {hasUnseenStatus && (
            <span className="absolute top-2 right-6 w-2 h-2 rounded-full bg-[#25d366]" />
          )}
        </button>
      </div>

      {activeSidebarTab === "chats" && (
        <>
          {/* Search */}
          <div className="p-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm outline-none"
              />
            </div>
          </div>
        </>
      )}

      {/* List content */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {activeSidebarTab === "calls" && (
          <CallsList callLogs={callLogs} onSelectCall={onSelectCall} />
        )}
        {activeSidebarTab === "status" && (
          <StatusList
            statuses={statuses}
            currentUser={currentUser}
            onAddStatus={onAddStatus}
            onSelectStatus={onSelectStatus}
          />
        )}
        {activeSidebarTab === "chats" && (
          <>
        {filteredGroups.length > 0 && (
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
            Groups
          </div>
        )}
        {filteredGroups.map((group) => {
          const gConvo = groupConversations[group.id];
          return (
            <button
              key={group.id}
              onClick={() => onSelectChat({ type: "group", data: group })}
              className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedChatId === group.id ? "bg-gray-100" : ""}`}
            >
              <img
                src={group.avatar}
                alt={group.name}
                className="w-12 h-12 rounded-full object-cover object-center bg-gray-100"
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-center">
                  <span
                    className={`truncate ${gConvo?.unread_count > 0 ? "font-bold text-gray-900" : "font-medium text-gray-900"}`}
                  >
                    {group.name}
                  </span>
                  {gConvo?.last_message_time && (
                    <span
                      className={`text-[11px] flex-shrink-0 ml-2 ${gConvo.unread_count > 0 ? "text-[#25d366] font-semibold" : "text-gray-400"}`}
                    >
                      {formatChatTime(gConvo.last_message_time)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p
                    className={`text-[13px] truncate pr-2 flex items-center gap-1.5 min-w-0 ${gConvo?.unread_count > 0 ? "text-gray-800 font-semibold" : "text-gray-500"}`}
                  >
                    {gConvo?.last_message ? (
                      <>
                        {gConvo.last_sender_id === currentUser.id ? "You" : gConvo.last_sender_name || "Someone"}:{" "}
                        {(() => {
                          const { label, iconType } = getLastMessagePreviewWithIcon(gConvo.last_message);
                          return (
                            <>
                              {iconType !== "text" && <LastMessageIcon iconType={iconType} />}
                              <span className="truncate">{label}</span>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      "Group Chat"
                    )}
                  </p>
                  {gConvo?.unread_count > 0 && (
                    <span className="flex-shrink-0 bg-[#25d366] text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                      {gConvo.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
          Direct Messages
        </div>
        {sortedUsers.map((user) => {
          const convo = conversations[user.id];
          return (
            <button
              key={user.id}
              onClick={() => onSelectChat({ type: "user", data: user })}
              className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedChatId === user.id ? "bg-gray-100" : ""}`}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-12 h-12 rounded-full object-cover object-center bg-gray-100"
                />
                {user.status === "online" && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-center">
                  <span
                    className={`truncate ${convo.unread_count > 0 ? "font-bold text-gray-900" : "font-medium text-gray-900"}`}
                  >
                    {user.username}
                  </span>
                  <span
                    className={`text-[11px] flex-shrink-0 ml-2 ${convo.unread_count > 0 ? "text-[#25d366] font-semibold" : "text-gray-400"}`}
                  >
                    {formatChatTime(convo.last_message_time)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p
                    className={`text-[13px] truncate pr-2 flex items-center gap-1.5 min-w-0 ${convo.unread_count > 0 ? "text-gray-800 font-semibold" : "text-gray-500"}`}
                  >
                    {convo.last_sender_id === currentUser.id ? "You: " : ""}
                    {(() => {
                      const { label, iconType } = getLastMessagePreviewWithIcon(convo.last_message);
                      return (
                        <>
                          {iconType !== "text" && <LastMessageIcon iconType={iconType} />}
                          <span className="truncate">{label}</span>
                        </>
                      );
                    })()}
                  </p>
                  {convo.unread_count > 0 && (
                    <span className="flex-shrink-0 bg-[#25d366] text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                      {convo.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
          </>
        )}
      </div>

      {/* New Chat Overlay */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="absolute inset-0 bg-white z-30 flex flex-col"
          >
            <div className="p-4 bg-[#008069] text-white flex items-center gap-6">
              <button onClick={() => setShowNewChat(false)}>
                <ArrowLeft size={24} />
              </button>
              <span className="text-xl font-semibold">New Chat</span>
            </div>
            <div className="p-2">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search users"
                  className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onSelectChat({ type: "user", data: user });
                    setShowNewChat(false);
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50"
                >
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover object-center bg-gray-100"
                  />
                  <span className="font-medium text-gray-900">
                    {user.username}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Overlay */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="absolute inset-0 bg-white z-30 flex flex-col"
          >
            <div className="p-4 bg-[#008069] text-white flex items-center gap-6">
              <button onClick={() => setShowCreateGroup(false)}>
                <ArrowLeft size={24} />
              </button>
              <span className="text-xl font-semibold">Create Group</span>
            </div>
            <div className="p-4 space-y-4">
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2 border-b-2 border-[#00a884] outline-none"
              />
              <div className="text-sm font-semibold text-gray-500">
                Select Members
              </div>
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((memberId) => {
                    const member = users.find((u) => u.id === memberId);
                    return member ? (
                      <span
                        key={memberId}
                        className="flex items-center gap-1 bg-[#e7fce3] text-[#008069] px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {member.username}
                        <button
                          onClick={() =>
                            setSelectedMembers((prev) =>
                              prev.filter((id) => id !== memberId),
                            )
                          }
                          className="ml-1 text-gray-500 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="max-h-[300px] overflow-y-auto">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const uid = user.id;
                        if (checked)
                          setSelectedMembers((prev) =>
                            prev.includes(uid) ? prev : [...prev, uid],
                          );
                        else
                          setSelectedMembers((prev) =>
                            prev.filter((id) => id !== uid),
                          );
                      }}
                      className="w-4 h-4 accent-[#00a884]"
                    />
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover object-center bg-gray-100"
                    />
                    <span>{user.username}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={onCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {!groupName.trim() && selectedMembers.length === 0
                  ? "Enter name & select members"
                  : !groupName.trim()
                    ? "Enter group name"
                    : selectedMembers.length === 0
                      ? "Select members"
                      : `Create Group (${selectedMembers.length} members)`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Settings */}
      <AnimatePresence>
        {showProfileSettings && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="absolute inset-0 bg-white z-40 flex flex-col"
          >
            <div className="p-4 bg-[#008069] text-white flex items-center gap-6">
              <button onClick={() => setShowProfileSettings(false)}>
                <ArrowLeft size={24} />
              </button>
              <span className="text-xl font-semibold">Profile</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
              <div className="relative group mb-8">
                <img
                  src={editAvatar?.trim() || currentUser?.avatar?.trim() || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect fill='%23e5e7eb' width='160' height='160'/%3E%3C/svg%3E"}
                  alt="Avatar"
                  className="w-40 h-40 rounded-full shadow-lg object-cover bg-gray-200"
                />
                <input
                  id="profile-avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onAvatarUpload(file);
                    }
                  }}
                />
                <label
                  htmlFor="profile-avatar-input"
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                >
                  Change Photo
                </label>
              </div>
              <div className="w-full space-y-6">
                <div>
                  <label className="block text-sm text-[#008069] mb-2">
                    Your Name
                  </label>
                  <div className="flex items-center border-b-2 border-gray-200 focus-within:border-[#008069] transition-colors">
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="flex-1 py-2 outline-none text-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This name will be visible to your WorkChat contacts.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-[#008069] mb-2">
                    About
                  </label>
                  <div className="flex items-center border-b-2 border-gray-200 focus-within:border-[#008069] transition-colors">
                    <input
                      type="text"
                      value={editAbout}
                      onChange={(e) => setEditAbout(e.target.value)}
                      className="flex-1 py-2 outline-none text-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={onUpdateProfile}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg font-semibold shadow-md hover:bg-[#008f70] transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
