"use client";

import React from "react";
import { Message, User } from "@/types";
import type { SelectedChat } from "./types";
import ChatHeader from "@/components/shared/ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "@/components/ui/MessageInput";
import WelcomeScreen from "@/components/shared/WelcomeScreen";

export interface ChatAreaProps {
  selectedChat: SelectedChat;
  currentUser: User;
  users: User[];
  groupMembers: User[];
  messages?: Message[];
  filteredMessages?: Message[];
  inputValue: string;
  setInputValue: (v: string) => void;
  replyTo: Message | null;
  setReplyTo: (m: Message | null) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  uploadingFile: boolean;
  selectMode: boolean;
  selectedMsgIds: Set<number | string>;
  showChatSearch: boolean;
  chatSearchQuery: string;
  showChatMenu: boolean;
  loadingMore: boolean;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onChatScroll?: () => void;
  onScroll?: () => void;
  onToggleSelect: (msgId: number | string) => void;
  onDoubleClick?: (msgId: number | string) => void;
  onDoubleClickSelect?: (msgId: number | string) => void;
  onReply: (msg: Message) => void;
  onDelete: (id: number | string, mode: "everyone" | "me") => void;
  onEdit: (id: number | string, content: string) => void;
  onAddReaction: (id: number | string, emoji: string) => void;
  onRemoveReaction: (id: number | string) => void;
  onFetchReadInfo: (messageId: number | string) => Promise<any[]>;
  onFetchReactionReactors: (messageId: number | string, emoji: string) => Promise<any[]>;
  onSendMessage: (e?: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVoiceSend: (blob: Blob) => void;
  onExitSelectMode: () => void;
  onCopy?: () => void;
  onCopySelected?: () => void;
  onDeleteSelected: () => void;
  onForward: () => void;
  onOpenInfo: () => void;
  onStartCall: (type: "audio" | "video") => void;
  setShowChatSearch: (v: boolean) => void;
  setChatSearchQuery: (v: string) => void;
  setShowChatMenu: (v: boolean) => void;
  onSelectMessages: () => void;
  onClearChat: () => void;
}

export default function ChatArea({
  selectedChat,
  currentUser,
  users,
  groupMembers,
  messages: messagesProp,
  filteredMessages: filteredMessagesProp,
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
  onScroll,
  onChatScroll,
  onToggleSelect,
  onDoubleClick,
  onDoubleClickSelect,
  onReply,
  onDelete,
  onEdit,
  onAddReaction,
  onRemoveReaction,
  onFetchReadInfo,
  onFetchReactionReactors,
  onSendMessage,
  onFileUpload,
  onVoiceSend,
  onExitSelectMode,
  onCopy,
  onCopySelected,
  onDeleteSelected,
  onForward,
  onOpenInfo,
  onStartCall,
  setShowChatSearch,
  setChatSearchQuery,
  setShowChatMenu,
  onSelectMessages,
  onClearChat,
}: ChatAreaProps) {
  if (!selectedChat) {
    return <WelcomeScreen />;
  }

  return (
    <>
      <ChatHeader
        selectedChat={selectedChat}
        currentUser={currentUser}
        groupMembers={groupMembers}
        selectMode={selectMode}
        selectedCount={selectedMsgIds.size}
        showChatSearch={showChatSearch}
        chatSearchQuery={chatSearchQuery}
        showChatMenu={showChatMenu}
        onExitSelectMode={onExitSelectMode}
        onCopy={onCopySelected}
        onDelete={onDeleteSelected}
        onForward={onForward}
        onOpenInfo={onOpenInfo}
        onStartCall={onStartCall}
        setShowChatSearch={setShowChatSearch}
        setChatSearchQuery={setChatSearchQuery}
        setShowChatMenu={setShowChatMenu}
        onSelectMessages={onSelectMessages}
        onClearChat={onClearChat}
      />

      <MessageList
        messages={filteredMessagesProp ?? messagesProp ?? []}
        currentUserId={currentUser.id}
        users={users}
        isGroup={selectedChat.type === "group"}
        selectMode={selectMode}
        selectedMsgIds={selectedMsgIds}
        loadingMore={loadingMore}
        chatScrollRef={chatScrollRef}
        messagesEndRef={messagesEndRef}
        onScroll={onScroll ?? onChatScroll ?? (() => {})}
        onToggleSelect={onToggleSelect}
        onDoubleClick={onDoubleClick ?? onDoubleClickSelect ?? (() => {})}
        onReply={onReply}
        onDelete={onDelete}
        onEdit={onEdit}
        onAddReaction={onAddReaction}
        onRemoveReaction={onRemoveReaction}
        onFetchReadInfo={onFetchReadInfo}
        onFetchReactionReactors={onFetchReactionReactors}
        inputRef={inputRef}
      />

      <MessageInput
        currentUser={currentUser}
        users={users}
        inputValue={inputValue}
        setInputValue={setInputValue}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        uploadingFile={uploadingFile}
        inputRef={inputRef}
        onSendMessage={onSendMessage}
        onFileUpload={onFileUpload}
        onVoiceSend={onVoiceSend}
      />
    </>
  );
}
