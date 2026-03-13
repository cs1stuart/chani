"use client";

import React from "react";
import { Plus, Video } from "lucide-react";
import { StatusItem, User } from "@/types";
import { formatChatTime } from "@/lib/utils";

interface Props {
  statuses: StatusItem[];
  currentUser: User;
  onAddStatus: () => void;
  onSelectStatus: (status: StatusItem) => void;
}

export default function StatusList({ statuses, currentUser, onAddStatus, onSelectStatus }: Props) {
  const myStatuses = statuses.filter((s) => s.user_id === currentUser.id);
  const othersStatuses = statuses.filter((s) => s.user_id !== currentUser.id);
  const byUser = new Map<string, StatusItem[]>();
  othersStatuses.forEach((s) => {
    const list = byUser.get(s.user_id) || [];
    list.push(s);
    byUser.set(s.user_id, list);
  });
  const otherUsers = Array.from(byUser.entries()).sort(
    (a, b) => new Date(b[1][0].created_at).getTime() - new Date(a[1][0].created_at).getTime(),
  );
  const recentUpdates = otherUsers.filter(([, list]) => !list[0].viewed_by_me);
  const reviewed = otherUsers.filter(([, list]) => list[0].viewed_by_me);

  return (
    <div className="flex-1 overflow-y-auto">
      <button
        type="button"
        onClick={() => {
          if (myStatuses.length) onSelectStatus(myStatuses[0]);
          else onAddStatus();
        }}
        className="w-full flex items-center gap-3 p-3 hover:bg-[#f0f2f5] text-left border-b border-gray-100"
      >
        <div className="relative flex-shrink-0">
          <img
            src={currentUser.avatar}
            alt={currentUser.username}
            className="w-12 h-12 rounded-full bg-gray-100 object-cover"
          />
          <span
            onClick={(e) => {
              e.stopPropagation();
              onAddStatus();
            }}
            className="absolute bottom-0 right-0 w-6 h-6 bg-[#00a884] rounded-full flex items-center justify-center border-2 border-white hover:bg-[#00926d] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">My status</p>
          <p className="text-xs text-gray-500">
            {myStatuses.length
              ? (() => {
                  const totalViews = myStatuses.reduce((a, s) => a + (s.view_count ?? 0), 0);
                  return totalViews > 0 ? `${totalViews} view${totalViews === 1 ? "" : "s"} · Tap to see who viewed` : "Tap to add another update";
                })()
              : "Tap to add status update"}
          </p>
        </div>
      </button>

      {recentUpdates.length > 0 && (
        <div className="py-2">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Recent updates
          </p>
          {recentUpdates.map(([userId, list]) => {
            const latest = list[0];
            const isVid = latest.media_type === "video" || (latest.media_url && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(latest.media_url));
            return (
              <button
                key={userId}
                type="button"
                onClick={() => onSelectStatus(latest)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#f0f2f5] text-left"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={latest.avatar}
                    alt={latest.username}
                    className="w-12 h-12 rounded-full bg-gray-100 object-cover ring-2 ring-[#00a884]"
                  />
                  {isVid && (
                    <span className="absolute bottom-0 right-0 w-5 h-5 bg-[#128C7E] rounded-full flex items-center justify-center border-2 border-white">
                      <Video className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{latest.username}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {isVid ? "Video · " : ""}{formatChatTime(latest.created_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="py-2 border-t border-gray-100">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Viewed statuses
          </p>
          {reviewed.map(([userId, list]) => {
            const latest = list[0];
            const isVid = latest.media_type === "video" || (latest.media_url && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(latest.media_url));
            return (
              <button
                key={userId}
                type="button"
                onClick={() => onSelectStatus(latest)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[#f0f2f5] text-left"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={latest.avatar}
                    alt={latest.username}
                    className="w-12 h-12 rounded-full bg-gray-100 object-cover"
                  />
                  {isVid && (
                    <span className="absolute bottom-0 right-0 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center border-2 border-white">
                      <Video className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{latest.username}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {isVid ? "Video · " : ""}{formatChatTime(latest.created_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {otherUsers.length === 0 && !myStatuses.length && (
        <div className="p-4 text-center text-sm text-gray-500">
          No status updates from contacts yet.
        </div>
      )}
    </div>
  );
}
