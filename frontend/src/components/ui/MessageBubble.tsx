import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCheck, X, Reply, Download, File as FileIcon, Trash2, Phone, Video, Mic, Pencil, Smile } from "lucide-react";
import { User, Message } from "@/types";
import { parseReply, formatTime, formatCallPreview } from "@/lib/utils";

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

function renderTextWithLinks(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const parts = line.split(URL_REGEX);
    return (
      <React.Fragment key={li}>
        {li > 0 && <br />}
        {parts.map((part, pi) =>
          URL_REGEX.test(part) ? (
            <a
              key={pi}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#027eb5] underline break-all hover:text-[#025e8a]"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          ) : (
            <React.Fragment key={pi}>{part}</React.Fragment>
          ),
        )}
      </React.Fragment>
    );
  });
}

interface ReadInfo {
  user_id: string;
  username: string;
  avatar: string;
  read_at: string;
}

interface ReactorInfo {
  user_id: string;
  username: string;
  avatar: string;
}

interface Props {
  msg: Message;
  currentUserId: string;
  users: User[];
  isGroup: boolean;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number | string) => void;
  onDoubleClick: (id: number | string) => void;
  onReply: (msg: Message) => void;
  onDelete: (id: number | string, mode: "everyone" | "me") => void;
  onEdit?: (id: number | string, content: string) => void;
  onAddReaction?: (id: number | string, emoji: string) => void;
  onRemoveReaction?: (id: number | string) => void;
  onFetchReadInfo?: (messageId: number | string) => Promise<ReadInfo[]>;
  onFetchReactionReactors?: (messageId: number | string, emoji: string) => Promise<ReactorInfo[]>;
}

const REACTIONS = ["👍", "❤️", "😂", "😊"];

const MessageBubble: React.FC<Props> = ({ msg, currentUserId, users, isGroup, selectMode, isSelected, onToggleSelect, onDoubleClick, onReply, onDelete, onEdit, onAddReaction, onRemoveReaction, onFetchReadInfo, onFetchReactionReactors }) => {
  const isMine = msg.sender_id === currentUserId;
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showReadInfo, setShowReadInfo] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionReactors, setShowReactionReactors] = useState<{ emoji: string; x: number; y: number } | null>(null);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [readInfoData, setReadInfoData] = useState<ReadInfo[] | null>(null);
  const [reactorData, setReactorData] = useState<ReactorInfo[] | null>(null);
  const [loadingReadInfo, setLoadingReadInfo] = useState(false);
  const [loadingReactors, setLoadingReactors] = useState(false);
  const deleteMenuRef = useRef<HTMLDivElement>(null);
  const readInfoRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);
  const reactionReactorsRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const myReaction = msg.reactions?.find((r) => r.userIds.includes(currentUserId));
  const canEdit = isMine && msg.type === "text" && !!onEdit;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(e.target as Node)) setShowDeleteMenu(false);
      if (readInfoRef.current && !readInfoRef.current.contains(e.target as Node)) setShowReadInfo(false);
      if (reactionRef.current && !reactionRef.current.contains(e.target as Node)) setShowReactionPicker(false);
      if (reactionReactorsRef.current && !reactionReactorsRef.current.contains(e.target as Node)) setShowReactionReactors(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (showEditInput) {
      setEditValue(msg.content || "");
      editInputRef.current?.focus();
    }
  }, [showEditInput, msg.content]);

  const handleTickClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMine) return;
    if (showReadInfo) {
      setShowReadInfo(false);
      return;
    }
    if (isGroup && onFetchReadInfo) {
      setShowReadInfo(true);
      setLoadingReadInfo(true);
      try {
        const data = await onFetchReadInfo(msg.id);
        setReadInfoData(data);
      } finally {
        setLoadingReadInfo(false);
      }
    } else if (!isGroup && msg.read_at) {
      const receiver = users.find((u) => u.id === msg.receiver_id);
      setReadInfoData(receiver ? [{ user_id: receiver.id, username: receiver.username, avatar: receiver.avatar, read_at: msg.read_at }] : []);
      setShowReadInfo(true);
    }
  };

  const handleReactionClick = async (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation();
    if (!onFetchReactionReactors) return;
    if (showReactionReactors?.emoji === emoji) {
      setShowReactionReactors(null);
      return;
    }
    setShowReactionReactors({ emoji, x: e.clientX, y: e.clientY });
    setLoadingReactors(true);
    setReactorData(null);
    try {
      const data = await onFetchReactionReactors(msg.id, emoji);
      setReactorData(data);
    } catch {
      setShowReactionReactors(null);
    } finally {
      setLoadingReactors(false);
    }
  };

  const renderTicks = () => {
    if (!isMine) return null;

    if (isGroup) {
      const readCount = msg.read_count || 0;
      const totalNeeded = (msg.total_members || 2) - 1;
      const allRead = readCount >= totalNeeded && totalNeeded > 0;

      return (
        <span onClick={handleTickClick} className={isGroup ? "cursor-pointer" : ""}>
          {allRead
            ? <CheckCheck size={14} className="text-[#53bdeb]" />
            : readCount > 0
              ? <CheckCheck size={14} className="text-gray-400" />
              : <Check size={14} className="text-gray-400" />
          }
        </span>
      );
    }

    if (msg.read_at) return <span onClick={handleTickClick} className="cursor-pointer"><CheckCheck size={14} className="text-[#53bdeb]" /></span>;
    const receiver = users.find(u => u.id === msg.receiver_id);
    if (receiver?.status === "online") return <CheckCheck size={14} className="text-gray-400" />;
    return <Check size={14} className="text-gray-400" />;
  };

  // Call message metadata
  let callMeta: { t?: "audio" | "video"; k?: string; d?: "outgoing" | "incoming"; dur?: number } | null = null;
  if (msg.type === "call") {
    try {
      callMeta = JSON.parse(msg.content || "{}");
    } catch {
      callMeta = null;
    }
  }

  return (
    <motion.div
      key={msg.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 ${isMine ? "justify-end" : "justify-start"} ${selectMode ? "cursor-pointer" : ""} ${selectMode && isSelected ? "bg-[#00a884]/10 -mx-4 px-4 py-1 rounded-lg" : ""}`}
      onClick={() => selectMode && onToggleSelect(msg.id)}
      onDoubleClick={() => onDoubleClick(msg.id)}
    >
      {selectMode && (
        <div className="flex-shrink-0">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-[#00a884] border-[#00a884]" : "border-gray-400"}`}>
            {isSelected && <Check size={12} className="text-white" />}
          </div>
        </div>
      )}
      <div className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        <div className={`w-full px-3 py-1.5 rounded-2xl relative group/msg min-w-0 flex flex-col ${isMine ? "bg-[#dcf8c6] text-gray-800 rounded-br-md shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-white text-gray-800 rounded-bl-md shadow-[0_1px_2px_rgba(0,0,0,0.08)]"}`}>
        {!selectMode && (
          <div className={`absolute ${isMine ? "-left-36" : "-right-36"} top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1`}>
            <button onClick={(e) => { e.stopPropagation(); onReply(msg); }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-[#00a884]" title="Reply"><Reply size={16} /></button>
            {canEdit && (
              <button onClick={(e) => { e.stopPropagation(); setShowEditInput(true); }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-[#00a884]" title="Edit"><Pencil size={16} /></button>
            )}
            {onAddReaction && (
              <div className="relative" ref={reactionRef}>
                <button onClick={(e) => { e.stopPropagation(); setShowReactionPicker(!showReactionPicker); }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-[#00a884]" title="React"><Smile size={16} /></button>
                <AnimatePresence>
                  {showReactionPicker && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-full left-0 mb-1 flex gap-1 p-1.5 bg-white rounded-xl shadow-xl border border-gray-100">
                      {REACTIONS.map((emoji) => (
                        <button key={emoji} onClick={(e) => { e.stopPropagation(); const same = myReaction?.emoji === emoji; if (same && onRemoveReaction) onRemoveReaction(msg.id); else onAddReaction?.(msg.id, emoji); setShowReactionPicker(false); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-lg" title={emoji}>{emoji}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); setShowDeleteMenu(!showDeleteMenu); }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={16} /></button>
          </div>
        )}

        {/* Delete Menu */}
        <AnimatePresence>
          {showDeleteMenu && (
            <motion.div
              ref={deleteMenuRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute ${isMine ? "right-0" : "left-0"} bottom-full mb-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[190px]`}
            >
              {isMine && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteMenu(false);
                    onDelete(msg.id, "everyone");
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete for everyone
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteMenu(false);
                  onDelete(msg.id, "me");
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <X size={14} />
                Delete for me
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isGroup && !isMine && msg.type !== "call" && (
          <p className="text-[11px] font-bold text-[#00a884] mb-1">{msg.sender_name}</p>
        )}

        {msg.type === "call" && callMeta && (() => {
          const isVoice = (callMeta.t || "audio") === "audio";
          const direction = callMeta.d || (isMine ? "outgoing" : "incoming");
          const status = callMeta.k || "completed";
          const durationSec = callMeta.dur || 0;

          let subtitle = "";
          if (status === "completed") {
            const secs = Math.max(1, Math.round(durationSec || 0));
            subtitle = `${secs} secs`;
          } else if (status === "declined") {
            subtitle = "Declined";
          } else if (status === "missed") {
            subtitle = direction === "incoming" ? "Missed call" : "No answer";
          } else if (status === "cancelled") {
            subtitle = direction === "outgoing" ? "No answer" : "Cancelled";
          }

          const title = isVoice ? "Voice call" : "Video call";

          return (
            <div className="flex w-full flex-col gap-4 min-w-[170px]">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? "bg-[#00a884]" : "bg-[#e9edef]"}`}>
                  {isVoice ? (
                    <Phone size={18} className={isMine ? "text-white" : "text-[#00a884]"} />
                  ) : (
                    <Video size={18} className={isMine ? "text-white" : "text-[#00a884]"} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold">{title}</span>
                  {subtitle && (
                    <span className="text-[11px] text-gray-600">{subtitle}</span>
                  )}
                </div>
              </div>
              <div className="flex w-full justify-end items-center gap-[3px] cursor-pointer select-none" onClick={isMine ? handleTickClick : undefined}>
                <span className="text-[11px] leading-none text-gray-500 opacity-75">{formatTime(msg.timestamp)}{msg.edited_at ? " · edited" : ""}</span>
                {isMine && (
                  <span className="relative flex items-center ml-[1px]">
                    {renderTicks()}
                    <AnimatePresence>
                      {showReadInfo && isMine && (
                        <motion.div
                          ref={readInfoRef}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[220px] max-w-[280px]"
                        >
                          <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-600">{isGroup ? "Read by" : "Seen"}</p>
                          </div>
                          {loadingReadInfo ? (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">Loading...</div>
                          ) : readInfoData && readInfoData.length > 0 ? (
                            <div className="max-h-[240px] overflow-y-auto py-2">
                              {readInfoData.map((r) => (
                                <div key={r.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                                  <img src={r.avatar} alt="" className="w-10 h-10 rounded-full object-cover object-center bg-gray-100 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{r.username}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Seen at {formatTime(r.read_at)}</p>
                                  </div>
                                  <CheckCheck size={16} className="text-[#53bdeb] flex-shrink-0" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">{isGroup ? "No one has read yet" : "Not seen yet"}</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {msg.type === "text" && (() => {
          if (showEditInput && canEdit) {
            return (
              <div className="pr-[55px]">
                <textarea
                  ref={editInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (editValue.trim()) { onEdit?.(msg.id, editValue.trim()); setShowEditInput(false); } }
                    if (e.key === "Escape") { setShowEditInput(false); }
                  }}
                  className="w-full min-h-[60px] px-2 py-1.5 text-[15px] border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#00a884]"
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { if (editValue.trim()) { onEdit?.(msg.id, editValue.trim()); setShowEditInput(false); } }} className="px-3 py-1 text-sm bg-[#00a884] text-white rounded-lg hover:bg-[#008f72]">Save</button>
                  <button onClick={() => setShowEditInput(false)} className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                </div>
              </div>
            );
          }
          const { reply, text } = parseReply(msg.content);
          return (
            <>
              {reply && (
                <div className={`rounded-lg mb-1.5 p-2 border-l-4 ${isMine ? "bg-[#c8edd5] border-[#06cf9c]" : "bg-[#f0f0f0] border-[#6b7be3]"} cursor-pointer`}>
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-semibold ${isMine ? "text-[#06cf9c]" : "text-[#6b7be3]"}`}>{reply.name}</p>
                      <p className="text-[13px] text-gray-600 truncate mt-0.5">
                        {reply.type === "call" && typeof reply.text === "string" && reply.text.trim().startsWith("{")
                          ? formatCallPreview(reply.text)
                          : reply.type === "audio"
                            ? "🎤 Voice message"
                            : reply.type === "video"
                              ? "🎬 Video"
                              : reply.text}
                      </p>
                    </div>
                    {reply.img && <img src={reply.img} alt="" className="w-11 h-11 rounded object-cover flex-shrink-0" />}
                  </div>
                </div>
              )}
              <p className={`text-[15px] whitespace-pre-wrap break-words pb-4 ${isMine ? "pr-[85px]" : "pr-[55px]"}`}>{renderTextWithLinks(text)}</p>
            </>
          );
        })()}

        {msg.type === "image" && (
          <div className="mb-4 -mx-0 -mt-0">
            <img
              src={msg.content}
              alt={msg.file_name || "Image"}
              className="max-w-[320px] w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              style={{ minHeight: 100, background: "#e5e7eb" }}
              onClick={(e) => { if (!selectMode) { e.stopPropagation(); window.open(msg.content, "_blank"); } }}
              loading="lazy"
            />
          </div>
        )}

        {msg.type === "video" && (
          <div className="mb-1 -mx-0 -mt-0">
            <video
              src={msg.content}
              controls
              playsInline
              preload="metadata"
              className="max-w-[320px] w-full rounded-lg"
              style={{ minHeight: 100, background: "#000" }}
            />
          </div>
        )}

        {msg.type === "file" && (
          <a
            href={selectMode ? undefined : msg.content}
            download={selectMode ? undefined : msg.file_name}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => { if (selectMode) e.preventDefault(); }}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors min-w-[240px]"
            style={{ background: isMine ? "rgba(255,255,255,0.5)" : "#f9fafb" }}
          >
            <div className="w-10 h-10 rounded-lg bg-[#00a884]/10 flex items-center justify-center flex-shrink-0"><FileIcon size={20} className="text-[#00a884]" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.file_name || "File"}</p>
              <p className="text-[11px] text-gray-400 uppercase mt-0.5">Document</p>
            </div>
            <Download size={18} className="text-gray-400 flex-shrink-0" />
          </a>
        )}

        {msg.type === "audio" && (
          <div className="mb-2 pr-[55px] flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? "bg-[#00a884]" : "bg-[#e9edef]"}`}>
              <Mic size={18} className={isMine ? "text-white" : "text-[#00a884]"} />
            </div>
            <audio
              controls
              src={msg.content}
              className="w-[220px]"
              onClick={(e) => {
                if (selectMode) e.preventDefault();
              }}
            />
          </div>
        )}

        {msg.type !== "call" && (
        <div className={`flex items-center gap-[3px] select-none w-full ${isMine ? "cursor-pointer justify-end" : "justify-end"}`} onClick={isMine ? handleTickClick : undefined}>
          <span className="text-[11px] leading-none text-gray-500 opacity-75">{formatTime(msg.timestamp)}{msg.edited_at ? " · edited" : ""}</span>
          {isMine && (
            <span className="relative flex items-center ml-[1px]">
              {renderTicks()}

              {/* Read Info Popup - WhatsApp style: profile + name + seen time */}
              <AnimatePresence>
                {showReadInfo && isMine && (
                  <motion.div
                    ref={readInfoRef}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[220px] max-w-[280px]"
                  >
                    <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-600">{isGroup ? "Read by" : "Seen"}</p>
                    </div>
                    {loadingReadInfo ? (
                      <div className="px-3 py-4 text-center text-xs text-gray-400">Loading...</div>
                    ) : readInfoData && readInfoData.length > 0 ? (
                      <div className="max-h-[240px] overflow-y-auto py-2">
                        {readInfoData.map((r) => (
                          <div key={r.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                            <img src={r.avatar} alt="" className="w-10 h-10 rounded-full object-cover object-center bg-gray-100 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{r.username}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">Seen at {formatTime(r.read_at)}</p>
                            </div>
                            <CheckCheck size={16} className="text-[#53bdeb] flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-center text-xs text-gray-400">{isGroup ? "No one has read yet" : "Not seen yet"}</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </span>
          )}
        </div>
        )}
        </div>
        {msg.reactions && msg.reactions.length > 0 && (
          <div ref={reactionReactorsRef} className={`relative flex flex-wrap gap-1.5 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
            {msg.reactions.map((r, i) => (
              <button
                key={`${r.emoji}-${i}`}
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!onFetchReactionReactors || r.count === 0) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setShowReactionReactors({ emoji: r.emoji, x: rect.left, y: rect.bottom });
                  setLoadingReactors(true);
                  try {
                    const data = await onFetchReactionReactors(msg.id, r.emoji);
                    setReactorData(data);
                  } finally {
                    setLoadingReactors(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-sm hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <span>{r.emoji}</span>
                {r.count > 1 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#00a884]/15 text-[11px] font-semibold text-[#00a884] px-1">
                    {r.count}
                  </span>
                )}
              </button>
            ))}
            {showReactionReactors && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-0 mb-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[200px] max-w-[260px]"
                  style={{ left: isMine ? "auto" : 0, right: isMine ? 0 : "auto" }}
                >
                  <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-600">
                      {showReactionReactors.emoji} Reacted by
                    </p>
                  </div>
                  {loadingReactors ? (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">Loading...</div>
                  ) : reactorData && reactorData.length > 0 ? (
                    <div className="max-h-[200px] overflow-y-auto py-2">
                      {reactorData.map((u) => (
                        <div key={u.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                          <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100 flex-shrink-0" />
                          <p className="text-sm font-medium text-gray-800 truncate">{u.username}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-gray-400">No one</div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
