"use client";

import { AnimatePresence, motion } from "motion/react";
import { Search, MoreVertical, Phone, Video, X, Copy, Trash2, Forward } from "lucide-react";
import { User, Group } from "@/types";
import { formatLastSeen } from "@/lib/utils";

interface Props {
  selectedChat: { type: "user" | "group"; data: User | Group };
  currentUser: User;
  groupMembers: User[];
  selectMode: boolean;
  selectedCount: number;
  showChatSearch: boolean;
  chatSearchQuery: string;
  showChatMenu: boolean;
  onExitSelectMode: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onForward: () => void;
  onOpenInfo: () => void;
  onStartCall: (type: "audio" | "video") => void;
  setShowChatSearch: (v: boolean) => void;
  setChatSearchQuery: (v: string) => void;
  setShowChatMenu: (v: boolean) => void;
  onSelectMessages: () => void;
  onClearChat: () => void;
}

export default function ChatHeader(props: Props) {
  const {
    selectedChat, currentUser, groupMembers, selectMode, selectedCount,
    showChatSearch, chatSearchQuery, showChatMenu,
    onExitSelectMode, onCopy, onDelete, onForward, onOpenInfo,
    onStartCall, setShowChatSearch, setChatSearchQuery, setShowChatMenu,
    onSelectMessages, onClearChat,
  } = props;

  if (selectMode) {
    return (
      <div className="p-3 bg-[#008069] border-b border-gray-200 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <button onClick={onExitSelectMode} className="text-white hover:text-gray-200"><X size={24} /></button>
          <span className="text-white font-semibold text-lg">{selectedCount} selected</span>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={onCopy} disabled={selectedCount === 0} className="text-white hover:text-gray-200 disabled:opacity-40" title="Copy"><Copy size={20} /></button>
          <button onClick={onDelete} disabled={selectedCount === 0} className="text-white hover:text-gray-200 disabled:opacity-40" title="Delete"><Trash2 size={20} /></button>
          <button onClick={onForward} disabled={selectedCount === 0} className="text-white hover:text-gray-200 disabled:opacity-40" title="Forward"><Forward size={20} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between z-10 relative">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenInfo}>
        <img src={selectedChat.data.avatar} alt={selectedChat.type === "user" ? (selectedChat.data as User).username : (selectedChat.data as Group).name} className="w-10 h-10 rounded-full object-cover object-center bg-gray-200" />
        <div>
          <h2 className="font-semibold text-gray-800 leading-tight">
            {selectedChat.type === "user" ? (selectedChat.data as User).username : (selectedChat.data as Group).name}
          </h2>
          <p className="text-xs text-gray-500 truncate max-w-[300px]">
            {selectedChat.type === "user"
              ? formatLastSeen(selectedChat.data as User)
              : groupMembers.length > 0
                ? groupMembers.map(m => m.id === currentUser.id ? "You" : m.username.split(" ")[0]).join(", ")
                : "Group Chat"}
          </p>
        </div>
      </div>
      <div className="flex gap-5 text-gray-500 items-center">
        {showChatSearch ? (
          <div className="flex items-center bg-white rounded-lg px-2 py-1 border border-gray-200">
            <input autoFocus type="text" placeholder="Search in chat..." className="outline-none text-sm w-32" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} />
            <button onClick={() => { setShowChatSearch(false); setChatSearchQuery(""); }}><X size={14} /></button>
          </div>
        ) : (
          <button className="hover:text-gray-700" onClick={() => setShowChatSearch(true)}><Search size={20} /></button>
        )}
        <button type="button" className="hover:text-gray-700" onClick={() => onStartCall("video")}><Video size={20} /></button>
        <button type="button" className="hover:text-gray-700" onClick={() => onStartCall("audio")}><Phone size={20} /></button>
        <div className="relative">
          <button className="hover:text-gray-700" onClick={() => setShowChatMenu(!showChatMenu)}><MoreVertical size={20} /></button>
          <AnimatePresence>
            {showChatMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                <button onClick={() => { onOpenInfo(); setShowChatMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Contact Info</button>
                <button onClick={() => { setShowChatSearch(true); setShowChatMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Search Messages</button>
                <button onClick={() => { onSelectMessages(); setShowChatMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Select Messages</button>
                <button onClick={onClearChat} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Clear Chat</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
