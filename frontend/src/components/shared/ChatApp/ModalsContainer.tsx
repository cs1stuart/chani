"use client";

import React from "react";
import { Message, User, Group } from "@/types";
import CallModal from "@/components/ui/CallModal";
import ChatInfoPanel from "@/components/ui/ChatInfoPanel";
import ForwardModal from "@/components/ui/ForwardModal";
import AddStatusModal from "@/components/ui/AddStatusModal";
import StatusViewModal from "@/components/ui/StatusViewModal";
import AvatarCropModal from "@/components/ui/AvatarCropModal";
import type { StatusItem } from "@/types";
import type { SelectedChat } from "./types";

export interface ModalsContainerProps {
  /** Call modal */
  call: {
    isReceivingCall: boolean;
    from: string;
    name: string;
    signal: unknown;
    type: "audio" | "video";
    status: "calling" | "ringing" | "connected";
    isGroupCall?: boolean;
    groupId?: string;
    groupName?: string;
  } | null;
  callAccepted: boolean;
  callDuration: number;
  stream: MediaStream | null;
  userStream: MediaStream | null;
  groupRemoteStreams: Record<string, MediaStream>;
  groupCallParticipantIds: string[];
  groupMembers: User[];
  currentUser: User | null;
  users: User[];
  remoteVideoOff: Record<string, boolean>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  myVideoRef: React.RefObject<HTMLVideoElement | null>;
  userVideoRef: React.RefObject<HTMLVideoElement | null>;
  onAnswerCall: () => void;
  onRejectCall: () => void;
  onLeaveCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  callMinimized?: boolean;
  onOpenChat?: () => void;
  onExpandCall?: () => void;
  onInviteToCall?: (userId: string) => void;
  onAddTo1_1Call?: (userIdOrIds: string | string[]) => void;
  /** Chat info panel */
  showChatInfo: boolean;
  selectedChat: SelectedChat;
  messages: Message[];
  onCloseChatInfo: () => void;
  onAddGroupMembers: (groupId: string, memberIds: string[]) => Promise<void>;
  onExitGroup: (groupId: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onRemoveMember: (groupId: string, memberId: string) => void;
  /** Forward modal */
  showForwardModal: boolean;
  selectedMsgCount: number;
  forwardTargets: string[];
  setForwardTargets: React.Dispatch<React.SetStateAction<string[]>>;
  groups: Group[];
  onCloseForwardModal: () => void;
  onForwardSend: () => void;
  /** Add status modal */
  showAddStatusModal: boolean;
  onCloseAddStatusModal: () => void;
  onCreateStatus: (payload: {
    text?: string;
    mediaUrl?: string;
    file?: File;
    mediaType?: string;
    bgColor?: string;
    fontStyle?: string;
  }) => Promise<void>;
  /** Status view modal */
  selectedStatusForView: { statuses: StatusItem[]; index: number } | null;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  fetchStatuses: () => Promise<void>;
  onCloseStatusView: () => void;
  onDeleteStatus: (statusId: string) => Promise<void>;
  /** Avatar crop modal */
  avatarCropImageUrl: string | null;
  onAvatarCrop: (blob: Blob) => Promise<void>;
  onAvatarCropCancel: () => void;
}

export default function ModalsContainer({
  call,
  callAccepted,
  callDuration,
  stream,
  userStream,
  groupRemoteStreams,
  groupCallParticipantIds,
  groupMembers,
  currentUser,
  users,
  remoteVideoOff,
  isMuted,
  isVideoOff,
  isScreenSharing,
  isRecording,
  myVideoRef,
  userVideoRef,
  onAnswerCall,
  onRejectCall,
  onLeaveCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  callMinimized = false,
  onOpenChat,
  onExpandCall,
  onInviteToCall,
  onAddTo1_1Call,
  showChatInfo,
  selectedChat,
  messages,
  onCloseChatInfo,
  onAddGroupMembers,
  onExitGroup,
  onDeleteGroup,
  onRemoveMember,
  showForwardModal,
  selectedMsgCount,
  forwardTargets,
  setForwardTargets,
  groups,
  onCloseForwardModal,
  onForwardSend,
  showAddStatusModal,
  onCloseAddStatusModal,
  onCreateStatus,
  selectedStatusForView,
  authFetch,
  fetchStatuses,
  onCloseStatusView,
  onDeleteStatus,
  avatarCropImageUrl,
  onAvatarCrop,
  onAvatarCropCancel,
}: ModalsContainerProps) {
  return (
    <>
      <CallModal
        call={call}
        callAccepted={callAccepted}
        callDuration={callDuration}
        stream={stream}
        userStream={userStream}
        groupRemoteStreams={groupRemoteStreams}
        groupCallParticipantIds={groupCallParticipantIds}
        groupMembers={groupMembers}
        currentUser={currentUser ?? undefined}
        users={users}
        remoteVideoOff={remoteVideoOff}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        myVideoRef={myVideoRef}
        userVideoRef={userVideoRef}
        onAnswer={onAnswerCall}
        onReject={onRejectCall}
        onLeave={onLeaveCall}
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={onToggleScreenShare}
        isRecording={isRecording}
        onToggleRecording={onToggleRecording}
        callMinimized={callMinimized}
        onOpenChat={onOpenChat}
        onExpandCall={onExpandCall}
        onInviteToCall={onInviteToCall}
        onAddTo1_1Call={onAddTo1_1Call}
      />

      <ChatInfoPanel
        show={showChatInfo}
        selectedChat={selectedChat}
        currentUser={currentUser!}
        groupMembers={groupMembers}
        allUsers={users}
        messages={messages}
        onClose={onCloseChatInfo}
        onAddMembers={onAddGroupMembers}
        onExitGroup={onExitGroup}
        onDeleteGroup={onDeleteGroup}
        onRemoveMember={onRemoveMember}
      />

      <ForwardModal
        show={showForwardModal}
        selectedCount={selectedMsgCount}
        users={users}
        groups={groups}
        forwardTargets={forwardTargets}
        setForwardTargets={setForwardTargets}
        onClose={onCloseForwardModal}
        onSend={onForwardSend}
      />

      <AddStatusModal
        show={showAddStatusModal}
        onClose={onCloseAddStatusModal}
        onSubmit={onCreateStatus}
      />

      {selectedStatusForView && currentUser && (
        <StatusViewModal
          statuses={selectedStatusForView.statuses}
          initialIndex={selectedStatusForView.index}
          currentUserId={currentUser.id}
          authFetch={authFetch}
          onViewRecorded={fetchStatuses}
          onClose={onCloseStatusView}
          onDelete={onDeleteStatus}
        />
      )}

      {avatarCropImageUrl && (
        <AvatarCropModal
          imageUrl={avatarCropImageUrl}
          onCrop={onAvatarCrop}
          onCancel={onAvatarCropCancel}
        />
      )}
    </>
  );
}
