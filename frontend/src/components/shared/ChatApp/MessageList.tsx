"use client";

import React from "react";
import { AnimatePresence } from "motion/react";
import { Message, User } from "@/types";
import MessageBubble from "@/components/ui/MessageBubble";
import { formatDateLabel } from "@/lib/utils";

export interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  users: User[];
  isGroup: boolean;
  selectMode: boolean;
  selectedMsgIds: Set<number | string>;
  loadingMore: boolean;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onToggleSelect: (msgId: number | string) => void;
  onDoubleClick: (msgId: number | string) => void;
  onReply: (msg: Message) => void;
  onDelete: (id: number | string, mode: "everyone" | "me") => void;
  onEdit: (id: number | string, content: string) => void;
  onAddReaction: (id: number | string, emoji: string) => void;
  onRemoveReaction: (id: number | string) => void;
  onFetchReadInfo: (messageId: number | string) => Promise<any[]>;
  onFetchReactionReactors: (messageId: number | string, emoji: string) => Promise<any[]>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function MessageList({
  messages,
  currentUserId,
  users,
  isGroup,
  selectMode,
  selectedMsgIds,
  loadingMore,
  chatScrollRef,
  messagesEndRef,
  onScroll,
  onToggleSelect,
  onDoubleClick,
  onReply,
  onDelete,
  onEdit,
  onAddReaction,
  onRemoveReaction,
  onFetchReadInfo,
  onFetchReactionReactors,
  inputRef,
}: MessageListProps) {
  return (
    <div
      ref={chatScrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"
    >
      {loadingMore && (
        <div className="flex justify-center py-3">
          <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <AnimatePresence initial={false}>
        {messages.map((msg, idx) => {
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const msgDate = new Date(msg.timestamp).toDateString();
          const prevDate = prevMsg ? new Date(prevMsg.timestamp).toDateString() : null;
          const showDateSep = msgDate !== prevDate;

          return (
            <React.Fragment key={msg.id}>
              {showDateSep && (
                <div className="flex justify-center my-3">
                  <span className="bg-white text-gray-500 text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm">
                    {formatDateLabel(msg.timestamp)}
                  </span>
                </div>
              )}
              <MessageBubble
                msg={msg}
                currentUserId={currentUserId}
                users={users}
                isGroup={isGroup}
                selectMode={selectMode}
                isSelected={selectedMsgIds.has(msg.id)}
                onToggleSelect={onToggleSelect}
                onDoubleClick={onDoubleClick}
                onReply={(m) => {
                  onReply(m);
                  inputRef.current?.focus();
                }}
                onDelete={onDelete}
                onEdit={onEdit}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
                onFetchReadInfo={onFetchReadInfo}
                onFetchReactionReactors={onFetchReactionReactors}
              />
            </React.Fragment>
          );
        })}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
}
