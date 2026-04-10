"use client";

import React from "react";
import type { User, Group, CallLogItem } from "@/types";
import Sidebar from "@/components/shared/Sidebar";
import type { StatusItem } from "@/types";

export interface ConversationMap {
  last_message: string;
  last_message_time: string;
  last_sender_id: string;
  unread_count: number;
}

export interface GroupConversationMap extends ConversationMap {
  last_sender_name: string;
}

export interface AppLayoutProps {
  currentUser: User;
  isConnected: boolean;
  users: User[];
  groups: Group[];
  conversations: Record<string, ConversationMap>;
  groupConversations: Record<string, GroupConversationMap>;
  selectedChatId: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectChat: (chat: { type: "user" | "group"; data: User | Group }) => void;
  onLogout: () => void;
  // New chat / Create group
  showNewChat: boolean;
  setShowNewChat: (v: boolean) => void;
  showCreateGroup: boolean;
  setShowCreateGroup: (v: boolean) => void;
  groupName: string;
  setGroupName: (v: string) => void;
  selectedMembers: string[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<string[]>>;
  onCreateGroup: () => Promise<void>;
  // Profile
  showProfileSettings: boolean;
  setShowProfileSettings: (v: boolean) => void;
  editUsername: string;
  setEditUsername: (v: string) => void;
  editAvatar: string;
  setEditAvatar: (v: string) => void;
  editAbout: string;
  setEditAbout: (v: string) => void;
  onUpdateProfile: () => Promise<void>;
  onOpenProfile: () => void;
  onAvatarUpload: (file: File) => void | Promise<void>;
  // Sidebar tabs
  activeSidebarTab: "chats" | "calls" | "status";
  setActiveSidebarTab: (v: "chats" | "calls" | "status") => void;
  callLogs: CallLogItem[];
  statuses: StatusItem[];
  onSelectCall: (item: CallLogItem) => void;
  onAddStatus: () => void;
  onSelectStatus: (s: StatusItem) => void;
  hasUnseenStatus: boolean;
  onOpenSettings: () => void;
  showSettings: boolean;
  onCloseSettings: () => void;
  isAdmin: boolean;
  onOpenAdminDashboard: () => void;
  children: React.ReactNode;
}

export default function AppLayout({
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
  children,
}: AppLayoutProps) {
  return (
    <div className="h-screen bg-[#f0f2f5] flex overflow-hidden relative">
      <Sidebar
        currentUser={currentUser}
        isConnected={isConnected}
        users={users}
        groups={groups}
        conversations={conversations}
        groupConversations={groupConversations}
        selectedChatId={selectedChatId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectChat={(chat) => {
          onCloseSettings();
          onSelectChat(chat);
        }}
        onLogout={onLogout}
        showNewChat={showNewChat}
        setShowNewChat={setShowNewChat}
        showCreateGroup={showCreateGroup}
        setShowCreateGroup={setShowCreateGroup}
        groupName={groupName}
        setGroupName={setGroupName}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        onCreateGroup={onCreateGroup}
        showProfileSettings={showProfileSettings}
        setShowProfileSettings={setShowProfileSettings}
        editUsername={editUsername}
        setEditUsername={setEditUsername}
        editAvatar={editAvatar}
        setEditAvatar={setEditAvatar}
        editAbout={editAbout}
        setEditAbout={setEditAbout}
        onUpdateProfile={onUpdateProfile}
        onOpenProfile={onOpenProfile}
        onAvatarUpload={onAvatarUpload}
        activeSidebarTab={activeSidebarTab}
        setActiveSidebarTab={setActiveSidebarTab}
        callLogs={callLogs}
        statuses={statuses}
        onSelectCall={onSelectCall}
        onAddStatus={onAddStatus}
        onSelectStatus={onSelectStatus}
        hasUnseenStatus={hasUnseenStatus}
        onOpenSettings={onOpenSettings}
        showSettings={showSettings}
        onCloseSettings={onCloseSettings}
        isAdmin={isAdmin}
        onOpenAdminDashboard={onOpenAdminDashboard}
      />
      {children}
    </div>
  );
}
