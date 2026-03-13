"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusItem } from "@/types";
import { formatChatTime } from "@/lib/utils";

const STATUS_DURATION = 6000;

interface Props {
  statuses: StatusItem[];
  initialIndex?: number;
  currentUserId: string;
  onClose: () => void;
  onDelete?: (statusId: string) => Promise<void>;
  authFetch?: (url: string, opts?: RequestInit) => Promise<Response>;
  onViewRecorded?: () => void;
}

export default function StatusViewModal({
  statuses,
  initialIndex = 0,
  currentUserId,
  onClose,
  onDelete,
  authFetch,
  onViewRecorded,
}: Props) {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startTimeRef = useRef(Date.now());

  const status = statuses[currentIdx];
  if (!status) {
    onClose();
    return null;
  }

  const isOwn = status.user_id === currentUserId;
  const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";
  const mediaUrl = status.media_url?.startsWith("http") ? status.media_url : base + (status.media_url || "");
  const viewers = status.viewers ?? [];

  const isVideo = status.media_type === "video" || (mediaUrl && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(mediaUrl));
  const isImage = !isVideo && mediaUrl && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(mediaUrl);
  const hasMedia = !!(mediaUrl && (isVideo || isImage));
  const isTextOnly = !hasMedia && !!(status.text);
  const hasBgColor = !!(status.bg_color);

  const textBgStyle: React.CSSProperties = hasBgColor
    ? status.bg_color!.startsWith("linear-gradient")
      ? { backgroundImage: status.bg_color! }
      : { backgroundColor: status.bg_color! }
    : {};
  const fontCss: React.CSSProperties = status.font_style
    ? status.font_style.startsWith("font-") ? {} : { fontFamily: status.font_style }
    : {};
  const fontClass = status.font_style?.startsWith("font-") ? status.font_style : "";

  const goNext = useCallback(() => {
    if (currentIdx < statuses.length - 1) {
      setCurrentIdx((i) => i + 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    } else {
      onClose();
    }
  }, [currentIdx, statuses.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setProgress(0);
      startTimeRef.current = Date.now();
    }
  }, [currentIdx]);

  useEffect(() => {
    if (!authFetch || !status.id) return;
    authFetch(`/api/status/${status.id}/view`, { method: "POST" })
      .then((r) => { if (r.ok) onViewRecorded?.(); })
      .catch(() => {});
  }, [status.id]);

  useEffect(() => {
    if (isVideo) return;
    setProgress(0);
    startTimeRef.current = Date.now();

    const tick = 50;
    timerRef.current = setInterval(() => {
      if (paused) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STATUS_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, tick);

    return () => clearInterval(timerRef.current);
  }, [currentIdx, paused, isVideo, goNext]);

  useEffect(() => {
    if (!isVideo) return;
    const vid = videoRef.current;
    if (!vid) return;

    const onTimeUpdate = () => {
      if (vid.duration) {
        setProgress((vid.currentTime / vid.duration) * 100);
      }
    };
    const onEnded = () => goNext();

    vid.addEventListener("timeupdate", onTimeUpdate);
    vid.addEventListener("ended", onEnded);
    return () => {
      vid.removeEventListener("timeupdate", onTimeUpdate);
      vid.removeEventListener("ended", onEnded);
    };
  }, [currentIdx, isVideo, goNext]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(status.id);
      if (statuses.length <= 1) {
        onClose();
      } else if (currentIdx >= statuses.length - 1) {
        setCurrentIdx((i) => Math.max(0, i - 1));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Left arrow */}
        {currentIdx > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Right arrow */}
        {currentIdx < statuses.length - 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}

        <motion.div
          key={status.id}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative max-w-lg w-full mx-14 max-h-[85vh] flex flex-col rounded-xl overflow-hidden bg-[#1f2c34]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={() => { setPaused(true); if (!isVideo) startTimeRef.current = Date.now() - (progress / 100) * STATUS_DURATION; }}
          onMouseUp={() => setPaused(false)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-2">
            {statuses.map((s, i) => (
              <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-[width] duration-75 ease-linear"
                  style={{
                    width: i < currentIdx ? "100%" : i === currentIdx ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-3 pt-5 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center gap-3 mt-1">
              <img
                src={status.avatar}
                alt={status.username}
                className="w-10 h-10 rounded-full object-cover object-center border-2 border-white/80 bg-gray-200"
              />
              <div>
                <p className="font-medium text-white text-sm">{status.username}</p>
                <p className="text-xs text-white/70">{formatChatTime(status.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {statuses.length > 1 && (
                <span className="text-white/60 text-xs mr-2">{currentIdx + 1}/{statuses.length}</span>
              )}
              {isOwn && onDelete && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="text-red-400 hover:text-red-300 p-1.5 rounded-full hover:bg-white/10 disabled:opacity-50"
                  title="Delete status"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-white/90 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={`flex-1 overflow-y-auto ${isTextOnly && hasBgColor ? "" : "p-4 pt-20"}`}>
            {isTextOnly && hasBgColor ? (
              <div
                className="flex items-center justify-center min-h-[350px] pt-20 px-6 pb-6"
                style={textBgStyle}
              >
                <p
                  className={`text-white whitespace-pre-wrap break-words text-center text-2xl leading-relaxed drop-shadow-md ${fontClass}`}
                  style={fontCss}
                >
                  {status.text}
                </p>
              </div>
            ) : (
              <>
                {isVideo && mediaUrl && (
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      src={mediaUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full max-h-[60vh] object-contain"
                    />
                  </div>
                )}
                {isImage && mediaUrl && (
                  <img
                    src={mediaUrl}
                    alt="Status"
                    className="w-full rounded-lg object-contain max-h-[60vh] bg-black/30"
                  />
                )}
                {!hasMedia && mediaUrl && (
                  <a
                    href={mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[#00a884] underline break-all mb-2"
                  >
                    View media
                  </a>
                )}
                {status.text && (
                  <p
                    className={`text-white whitespace-pre-wrap break-words ${fontClass} ${hasMedia ? "mt-3" : "text-xl text-center py-12"}`}
                    style={fontCss}
                  >
                    {status.text}
                  </p>
                )}
              </>
            )}

            {/* Views (own status) */}
            {isOwn && viewers.length > 0 && (() => {
              const uniqueViewers = viewers.filter((v, i, arr) => arr.findIndex((x) => x.user_id === v.user_id) === i);
              const count = uniqueViewers.length;
              return (
                <div className={`mt-4 pt-4 border-t border-white/20 ${isTextOnly && hasBgColor ? "mx-4 mb-4" : ""}`}>
                  <p className="flex items-center gap-2 text-white/90 text-sm font-medium mb-2">
                    <Eye className="w-4 h-4" />
                    {count} {count === 1 ? "view" : "views"}
                  </p>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {uniqueViewers.map((v) => (
                      <li key={v.user_id} className="flex items-center gap-3 text-white/80 text-sm">
                        <img
                          src={v.avatar}
                          alt={v.username}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                        <span className="flex-1 truncate">{v.username}</span>
                        <span className="text-white/50 text-xs flex-shrink-0">{formatChatTime(v.viewed_at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
