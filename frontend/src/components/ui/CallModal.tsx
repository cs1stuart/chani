import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone,
  Video,
  MoreVertical,
  Mic,
  MicOff,
  VideoOff,
  MessageSquare,
  X,
  Monitor,
  MonitorOff,
  Circle,
  Square,
  Maximize2,
  UserPlus,
  Check,
} from "lucide-react";
import { formatCallTime } from "@/lib/utils";

interface CallState {
  isReceivingCall: boolean;
  from: string;
  name: string;
  signal: any;
  type: "audio" | "video";
  status: "calling" | "ringing" | "connected";
  isGroupCall?: boolean;
  groupId?: string;
  groupName?: string;
}

interface ParticipantInfo {
  id: string;
  username: string;
  avatar: string;
}

interface Props {
  call: CallState | null;
  callAccepted: boolean;
  callDuration: number;
  stream: MediaStream | null;
  userStream: MediaStream | null;
  groupRemoteStreams?: Record<string, MediaStream>;
  groupCallParticipantIds?: string[];
  groupMembers?: ParticipantInfo[];
  users?: ParticipantInfo[];
  currentUser?: ParticipantInfo | null;
  remoteVideoOff?: Record<string, boolean>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  myVideoRef: React.RefObject<HTMLVideoElement | null>;
  userVideoRef: React.RefObject<HTMLVideoElement | null>;
  onAnswer: () => void;
  onReject: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  callMinimized?: boolean;
  onOpenChat?: () => void;
  onExpandCall?: () => void;
  onInviteToCall?: (userId: string) => void;
  onAddTo1_1Call?: (userIdOrIds: string | string[]) => void;
}

function hasActiveVideo(stream: MediaStream): boolean {
  const tracks = stream.getVideoTracks();
  return tracks.length > 0 && tracks.some((t) => t.enabled && !t.muted && t.readyState === "live");
}

function getParticipantInfo(
  userId: string,
  users: ParticipantInfo[] = [],
  groupMembers: ParticipantInfo[] = [],
  currentUser: ParticipantInfo | null | undefined
): { username: string; avatar: string; initial: string } {
  if (currentUser?.id === userId) {
    return {
      username: currentUser.username,
      avatar: currentUser.avatar,
      initial: (currentUser.username?.[0] || "?").toUpperCase(),
    };
  }
  const u = users.find((x) => x.id === userId) || groupMembers.find((m) => m.id === userId);
  if (u) {
    return {
      username: u.username,
      avatar: u.avatar,
      initial: (u.username?.[0] || "?").toUpperCase(),
    };
  }
  const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userId)}`;
  return { username: "Participant", avatar: fallback, initial: "?" };
}

function RemoteVideo({ stream, className }: { stream: MediaStream; className?: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (el) el.srcObject = stream;
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);
  return (
    <video ref={ref} playsInline autoPlay className={className ?? "w-full h-full object-contain bg-black"} />
  );
}

export default function CallModal({
  call,
  callAccepted,
  callDuration,
  stream,
  userStream,
  groupRemoteStreams = {},
  groupCallParticipantIds = [],
  groupMembers = [],
  users = [],
  currentUser,
  remoteVideoOff = {},
  isMuted,
  isVideoOff,
  isScreenSharing = false,
  myVideoRef,
  userVideoRef,
  onAnswer,
  onReject,
  onLeave,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  isRecording = false,
  onToggleRecording,
  callMinimized = false,
  onOpenChat,
  onExpandCall,
  onInviteToCall,
  onAddTo1_1Call,
}: Props) {
  const [showInvitePicker, setShowInvitePicker] = React.useState(false);
  const [selectedToAdd1_1, setSelectedToAdd1_1] = React.useState<Set<string>>(new Set());
  const isGroupCall = call?.isGroupCall && call?.groupId;
  const inCallIds = new Set([currentUser?.id, ...groupCallParticipantIds].filter(Boolean));
  // Group call: show ALL users not in call (anyone in call can add anyone)
  const membersToInvite = isGroupCall
    ? (users || []).filter((u) => !inCallIds.has(u.id))
    : (groupMembers || []).filter((m) => !inCallIds.has(m.id));
  const usersToAddIn1_1 = (users || []).filter((u) => u.id !== currentUser?.id && u.id !== call?.from);
  const showMinimized = callMinimized && callAccepted && call?.status === "connected";
  const allParticipants = isGroupCall
    ? Array.from(new Set([currentUser?.id, ...(groupCallParticipantIds || [])].filter(Boolean).map((id) => String(id))))
    : [];

  return (
    <AnimatePresence>
      {call && (
        <>
          {showMinimized ? (
            <motion.div
              key={`call-minimized-${call.from}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl shadow-2xl px-4 py-3 text-gray-900"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {stream && call.type === "video" && (!isVideoOff || isScreenSharing) ? (
                    <video
                      playsInline
                      muted
                      ref={myVideoRef}
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-white/80">
                      {(call.groupName || call.name)[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{call.groupName || call.name}</p>
                  <p className="text-sm text-white/60 font-mono">{formatCallTime(callDuration)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleMute}
                  className={`p-2 rounded-full transition-colors ${isMuted ? "bg-[#E53935] text-white" : "hover:bg-white/10 text-white/80"}`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  onClick={onToggleVideo}
                  className={`p-2 rounded-full transition-colors ${isVideoOff ? "bg-[#E53935] text-white" : "hover:bg-white/10 text-white/80"}`}
                  title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                >
                  {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
                {((isGroupCall && onInviteToCall) || (!isGroupCall && onAddTo1_1Call)) && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (showInvitePicker) setSelectedToAdd1_1(new Set());
                        setShowInvitePicker((v) => !v);
                      }}
                      className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors"
                      title="Add participant"
                    >
                      <UserPlus size={18} />
                    </button>
                    {showInvitePicker && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 max-h-48 overflow-y-auto bg-[#1a1a1d] border border-white/10 rounded-xl shadow-2xl py-2 z-[110]">
                        {isGroupCall
                          ? membersToInvite.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => onInviteToCall?.(m.id)}
                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/10 text-left"
                              >
                                <img src={m.avatar} alt={m.username} className="w-8 h-8 rounded-full object-cover" />
                                <span className="text-white truncate">{m.username}</span>
                              </button>
                            ))
                          : (
                              <>
                                {usersToAddIn1_1.map((m) => (
                                  <button
                                    key={m.id}
                                    onClick={() => {
                                      setSelectedToAdd1_1((s) => {
                                        const next = new Set(s);
                                        if (next.has(m.id)) next.delete(m.id);
                                        else next.add(m.id);
                                        return next;
                                      });
                                    }}
                                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/10 text-left"
                                  >
                                    <span className="flex-shrink-0 w-4 h-4 rounded border-2 border-white/50 flex items-center justify-center">
                                      {selectedToAdd1_1.has(m.id) && <span className="w-2 h-2 rounded-full bg-[#00a884]" />}
                                    </span>
                                    <img src={m.avatar} alt={m.username} className="w-8 h-8 rounded-full object-cover" />
                                    <span className="text-white truncate">{m.username}</span>
                                  </button>
                                ))}
                                {selectedToAdd1_1.size > 0 && (
                                  <button
                                    onClick={() => {
                                      onAddTo1_1Call?.(Array.from(selectedToAdd1_1));
                                      setSelectedToAdd1_1(new Set());
                                      setShowInvitePicker(false);
                                    }}
                                    className="w-full mx-2 mt-2 py-2 bg-[#00a884] text-white rounded-lg text-sm font-medium"
                                  >
                                    Add {selectedToAdd1_1.size} participant{selectedToAdd1_1.size > 1 ? "s" : ""}
                                  </button>
                                )}
                              </>
                            )}
                        {(isGroupCall ? membersToInvite.length === 0 : usersToAddIn1_1.length === 0) && (
                          <p className="px-4 py-3 text-white/60 text-sm">No one to add</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {onExpandCall && (
                  <button
                    onClick={onExpandCall}
                    className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors"
                    title="Expand call"
                  >
                    <Maximize2 size={18} />
                  </button>
                )}
                <button
                  onClick={onLeave}
                  className="p-2 rounded-full bg-[#E53935] text-white hover:bg-[#d32f2f] transition-colors"
                  title="End call"
                >
                  <Phone size={18} className="rotate-[135deg]" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`call-modal-${call.from}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#f0f2f5] z-[100] flex flex-col items-center justify-between text-gray-900 p-8"
            >
          <div className="w-full flex justify-between items-center opacity-40">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/50" />
              <div className="w-2 h-2 rounded-full bg-white/50" />
              <div className="w-2 h-2 rounded-full bg-white/50" />
            </div>
          </div>

          {isGroupCall && allParticipants.length > 0 ? (
            <div className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden min-h-0">
              <div
                className="grid gap-2 sm:gap-3 p-3 sm:p-4 w-full max-w-5xl flex-1 min-h-0 place-content-center"
                style={{
                  gridTemplateColumns: `repeat(${allParticipants.length <= 2 ? allParticipants.length : Math.min(3, allParticipants.length)}, minmax(0, 1fr))`,
                  gridAutoRows: "minmax(160px, 1fr)",
                }}
              >
                {allParticipants.map((userId) => {
                  const info = getParticipantInfo(userId, users, groupMembers, currentUser);
                  const isMe = String(userId) === String(currentUser?.id);
                  const remoteStream = groupRemoteStreams[userId];
                  const showVideo =
                    isMe
                      ? stream && call.type === "video" && (!isVideoOff || isScreenSharing)
                      : remoteStream && call.type === "video" && hasActiveVideo(remoteStream) && !remoteVideoOff[userId];

                  return (
                    <div
                      key={userId}
                      className="relative min-w-0 min-h-[160px] rounded-xl sm:rounded-2xl overflow-hidden bg-gray-900 border-2 border-white/10 shadow-xl flex items-center justify-center"
                    >
                      <span className="absolute top-2 left-2 z-10 text-xs font-semibold text-white/95 bg-black/60 px-2 py-1 rounded truncate max-w-[85%]">
                        {isMe ? "You" : info.username}
                      </span>
                      {showVideo ? (
                        isMe ? (
                          <video
                            playsInline
                            autoPlay
                            muted
                            ref={myVideoRef}
                            className="absolute inset-0 w-full h-full object-contain object-center bg-black"
                          />
                        ) : (
                          <RemoteVideo stream={remoteStream} className="absolute inset-0 w-full h-full object-contain object-center bg-black" />
                        )
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-3">
                          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                            <img
                              src={info.avatar}
                              alt={info.username}
                              className="w-full h-full rounded-full object-cover border-2 border-white/40 shadow-xl bg-gray-700"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                (target.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                              }}
                            />
                            <div className="hidden absolute inset-0 rounded-full border-2 border-white/40 shadow-xl bg-[#00a884] items-center justify-center text-2xl sm:text-3xl font-bold text-white">
                              {info.initial}
                            </div>
                          </div>
                          <span className="mt-2 text-sm font-medium text-white truncate max-w-full px-2 text-center">
                            {isMe ? "You" : info.username}
                          </span>
                        </div>
                      )}
                      {call.status === "connected" && (
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-[#facc15] text-black text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Live
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <h2 className="text-xl sm:text-2xl font-medium mt-3 flex-shrink-0">{call.groupName || call.name}</h2>
              <p className="text-white/60 font-mono text-sm sm:text-base flex-shrink-0">{formatCallTime(callDuration)}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center flex-1 justify-center">
              <div className="relative mb-8">
                <div className="w-40 h-40 rounded-full bg-gray-800 overflow-hidden border-[6px] border-[#facc15] shadow-2xl relative">
                  {userStream && call.type === "video" ? (
                    <video
                      playsInline
                      ref={userVideoRef}
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-bold bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]">
                      {call.name[0]}
                    </div>
                  )}
                </div>
                {call.status === "connected" && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#facc15] text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    Live
                  </div>
                )}
              </div>
              <h2 className="text-4xl font-medium mb-1 tracking-tight">{call.name}</h2>
              <p className="text-white/60 text-xl font-mono">
                {call.status === "connected"
                  ? formatCallTime(callDuration)
                  : call.name.includes("(Call Ended)")
                    ? "Call Ended"
                    : call.status === "ringing"
                      ? "Ringing..."
                      : "Calling..."}
              </p>
            </div>
          )}

          <div className="w-full max-w-2xl flex items-center justify-center gap-6 pb-8">
            {call.isReceivingCall && !callAccepted ? (
              <div className="flex gap-12">
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={onAnswer}
                    className="w-16 h-16 bg-[#00a884] rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-[#00a884]/20"
                  >
                    <Phone size={28} />
                  </button>
                  <span className="text-xs font-medium text-white/70">Accept</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={onReject}
                    className="w-16 h-16 bg-[#ea4335] rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-[#ea4335]/20"
                  >
                    <X size={28} />
                  </button>
                  <span className="text-xs font-medium text-white/70">Decline</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10">
                <button className="p-4 hover:bg-white/10 rounded-full transition-colors text-white/80">
                  <MoreVertical size={24} />
                </button>
                <button
                  onClick={onToggleMute}
                  className={`p-4 rounded-full transition-colors ${isMuted ? "bg-[#E53935] text-white" : "hover:bg-white/10 text-white/80"}`}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button
                  onClick={() => onOpenChat?.()}
                  className="p-4 hover:bg-white/10 rounded-full transition-colors text-white/80"
                  title="Open chat"
                >
                  <MessageSquare size={24} />
                </button>
                {(isGroupCall && call.status === "connected" && onInviteToCall) || (!isGroupCall && call.status === "connected" && onAddTo1_1Call) ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowInvitePicker((v) => !v)}
                      className="p-4 hover:bg-white/10 rounded-full transition-colors text-white/80"
                      title="Add participant"
                    >
                      <UserPlus size={24} />
                    </button>
                    {showInvitePicker && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 max-h-48 overflow-y-auto bg-[#1a1a1d] border border-white/10 rounded-xl shadow-2xl py-2 z-[110]">
                        {isGroupCall
                          ? membersToInvite.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  onInviteToCall?.(m.id);
                                  // Keep picker open so user can add more participants
                                }}
                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/10 text-left"
                              >
                                <img src={m.avatar} alt={m.username} className="w-8 h-8 rounded-full object-cover" />
                                <span className="text-white truncate">{m.username}</span>
                              </button>
                            ))
                          : usersToAddIn1_1.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  onAddTo1_1Call?.(m.id);
                                  // Keep picker open so user can add more (1:1 converts after first add)
                                }}
                                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/10 text-left"
                              >
                                <img src={m.avatar} alt={m.username} className="w-8 h-8 rounded-full object-cover" />
                                <span className="text-white truncate">{m.username}</span>
                              </button>
                            ))}
                        {(isGroupCall ? membersToInvite.length : usersToAddIn1_1.length) === 0 && (
                          <p className="px-4 py-3 text-white/60 text-sm">No one to add</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
                {onToggleRecording && (
                  <button
                    onClick={onToggleRecording}
                    className={`p-4 rounded-full transition-colors ${isRecording ? "bg-[#E53935] text-white" : "hover:bg-white/10 text-white/80"}`}
                    title={isRecording ? "Stop recording" : "Record call"}
                  >
                    {isRecording ? <Square size={24} fill="currentColor" /> : <Circle size={24} />}
                  </button>
                )}
                {call.type === "video" && onToggleScreenShare && (
                  <button
                    onClick={onToggleScreenShare}
                    className={`p-4 rounded-full transition-colors ${isScreenSharing ? "bg-[#4CAF50] text-white" : "hover:bg-white/10 text-white/80"}`}
                    title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
                  >
                    {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
                  </button>
                )}
                <button
                  onClick={onLeave}
                  className="w-16 h-16 bg-[#E53935] rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-[#E53935]/30 mx-2"
                >
                  <Phone size={32} className="rotate-[135deg]" />
                </button>
                <button
                  onClick={onToggleVideo}
                  className={`p-4 rounded-full transition-colors ${isVideoOff ? "bg-[#E53935] text-white" : "hover:bg-white/10 text-white/80"}`}
                >
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
              </div>
            )}
          </div>

          {stream && call.type === "video" && (!isVideoOff || isScreenSharing) && !isGroupCall && (
            <div className="absolute bottom-32 right-8 w-48 h-32 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
              <video
                playsInline
                muted
                ref={myVideoRef}
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          )}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
