"use client";

import React from "react";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { CallLogItem } from "@/types";
import { formatChatTime } from "@/lib/utils";

interface Props {
  callLogs: CallLogItem[];
  onSelectCall: (item: CallLogItem) => void;
}

export default function CallsList({ callLogs, onSelectCall }: Props) {
  if (!callLogs.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-4">
        No recent calls
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {callLogs.map((item) => {
        const isMissed = item.status === "missed" && !item.is_outgoing;
        const Icon = item.type === "video" ? Video : Phone;
        const DirIcon = item.is_outgoing ? PhoneOutgoing : isMissed ? PhoneMissed : PhoneIncoming;
        const subtitle =
          item.status === "completed"
            ? item.is_outgoing
              ? `Outgoing ${item.type} · ${formatDuration(item.duration)}`
              : `Incoming ${item.type} · ${formatDuration(item.duration)}`
            : item.status === "missed"
              ? "Missed call"
              : item.status === "declined"
                ? "Declined"
                : item.status === "cancelled"
                  ? item.is_outgoing
                    ? "No answer"
                    : "Cancelled"
                  : item.status;

        const showStackedAvatars = item.participants && item.participants.length > 0;
        const displayName = item.participants?.length
          ? item.participants.map((p) => p.name).join(", ")
          : item.other_user_name;
        const isGroupCall = Boolean(item.group_id);
        // Group calls use PhoneOutgoing (phone with upward arrow) like WhatsApp
        const CallTypeIcon = isGroupCall ? PhoneOutgoing : DirIcon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectCall(item)}
            className="w-full flex items-center gap-3 p-3 hover:bg-[#f0f2f5] text-left"
          >
            {/* Layout like image: Icon (left) | Stacked Avatars | Names + Status | Timestamp */}
            {showStackedAvatars && item.participants && item.participants.length > 0 ? (
              <>
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <CallTypeIcon className="w-5 h-5 text-gray-600" />
                </span>
                <div className="w-12 h-12 relative flex-shrink-0">
                  {item.participants.slice(0, 3).map((p, i) => (
                    <img
                      key={p.id}
                      src={p.avatar}
                      alt={p.name}
                      className="w-8 h-8 rounded-full bg-gray-100 object-cover border-2 border-white absolute"
                      style={{
                        top: i === 0 ? "0" : i === 1 ? "0" : "12px",
                        left: i === 0 ? "0" : i === 1 ? "12px" : "12px",
                        zIndex: 3 - i,
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="relative flex-shrink-0">
                <img
                  src={item.other_user_avatar}
                  alt={item.other_user_name}
                  className="w-12 h-12 rounded-full bg-gray-100 object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm">
                  <DirIcon className="w-3.5 h-3.5 text-gray-600" />
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${isMissed ? "text-red-600" : "text-gray-900"}`} title={displayName}>
                <span className="line-clamp-2">{displayName}</span>
              </p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {subtitle}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {formatChatTime(item.created_at)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} sec` : `${m} min`;
}
