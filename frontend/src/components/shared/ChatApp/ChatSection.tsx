"use client";

import React from "react";
import { User } from "@/types";
import SettingsPanel from "@/components/settings/SettingsPanel";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ChatArea from "./ChatArea";
import WelcomeScreen from "@/components/shared/WelcomeScreen";
import type { ChatAreaProps } from "./ChatArea";
import type { SelectedChat } from "./types";

export interface ChatSectionProps {
  adminDashboardUserId: string;
  showAdminDashboard: boolean;
  onBackFromAdminDashboard: () => void;
  showSettings: boolean;
  selectedChat: SelectedChat;
  currentUser: User;
  onBackFromSettings: () => void;
  onOpenEditProfile: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onCloseProfile?: () => void;
  onCloseNewChat?: () => void;
  onCloseCreateGroup?: () => void;
  chatAreaProps: Omit<ChatAreaProps, "selectedChat" | "currentUser">;
}

export default function ChatSection({
  adminDashboardUserId,
  showAdminDashboard,
  onBackFromAdminDashboard,
  showSettings,
  selectedChat,
  currentUser,
  onBackFromSettings,
  onOpenEditProfile,
  authFetch,
  onCloseProfile,
  onCloseNewChat,
  onCloseCreateGroup,
  chatAreaProps,
}: ChatSectionProps) {
  const handleAreaClick = () => {
    onCloseProfile?.();
    onCloseNewChat?.();
    onCloseCreateGroup?.();
  };

  return (
    <div
      className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#efeae2] relative"
      onClick={handleAreaClick}
      role="presentation"
    >
      {showAdminDashboard ? (
        <AdminDashboard
          authFetch={authFetch}
          onBack={onBackFromAdminDashboard}
          currentUserId={adminDashboardUserId}
        />
      ) : showSettings ? (
        <SettingsPanel
          currentUser={currentUser}
          authFetch={authFetch}
          onBack={onBackFromSettings}
          onOpenEditProfile={onOpenEditProfile}
        />
      ) : selectedChat ? (
        <ChatArea
          {...chatAreaProps}
          selectedChat={selectedChat}
          currentUser={currentUser}
        />
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
}
