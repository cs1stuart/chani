"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ImageIcon, Video, Type, Palette, ChevronLeft, ChevronRight } from "lucide-react";

const BG_COLORS = [
  { id: "teal",     bg: "#00a884", label: "Teal" },
  { id: "emerald",  bg: "#128C7E", label: "Emerald" },
  { id: "blue",     bg: "#1e40af", label: "Blue" },
  { id: "indigo",   bg: "#4338ca", label: "Indigo" },
  { id: "purple",   bg: "#7c3aed", label: "Purple" },
  { id: "pink",     bg: "#db2777", label: "Pink" },
  { id: "rose",     bg: "#e11d48", label: "Rose" },
  { id: "orange",   bg: "#ea580c", label: "Orange" },
  { id: "amber",    bg: "#d97706", label: "Amber" },
  { id: "sky",      bg: "#0284c7", label: "Sky" },
  { id: "slate",    bg: "#334155", label: "Slate" },
  { id: "zinc",     bg: "#18181b", label: "Black" },
  { id: "grad1",    bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", label: "Violet Gradient" },
  { id: "grad2",    bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", label: "Pink Gradient" },
  { id: "grad3",    bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", label: "Ocean Gradient" },
  { id: "grad4",    bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", label: "Mint Gradient" },
  { id: "grad5",    bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", label: "Sunset Gradient" },
  { id: "grad6",    bg: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", label: "Lavender Gradient" },
];

const FONT_STYLES = [
  { id: "sans",       label: "Sans",       style: "font-sans",     preview: "Aa" },
  { id: "serif",      label: "Serif",      style: "font-serif",    preview: "Aa" },
  { id: "mono",       label: "Mono",       style: "font-mono",     preview: "Aa" },
  { id: "cursive",    label: "Cursive",    style: "",              preview: "Aa", fontFamily: "'Segoe Script', 'Dancing Script', cursive" },
  { id: "fantasy",    label: "Bold",       style: "",              preview: "Aa", fontFamily: "'Impact', 'Arial Black', sans-serif" },
  { id: "handwrite",  label: "Hand",       style: "",              preview: "Aa", fontFamily: "'Comic Sans MS', 'Caveat', cursive" },
];

interface Props {
  show: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    text?: string;
    mediaUrl?: string;
    file?: File;
    mediaType?: string;
    bgColor?: string;
    fontStyle?: string;
  }) => Promise<void>;
}

export default function AddStatusModal({ show, onClose, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"choose" | "text" | "media">("choose");
  const [bgColorIdx, setBgColorIdx] = useState(0);
  const [fontIdx, setFontIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isVideo = file?.type.startsWith("video/");
  const currentBg = BG_COLORS[bgColorIdx];
  const currentFont = FONT_STYLES[fontIdx];
  const bgStyle = currentBg.bg.startsWith("linear-gradient")
    ? { backgroundImage: currentBg.bg }
    : { backgroundColor: currentBg.bg };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !file) {
      setError("Add some text, photo or video.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit({
        text: text.trim() || undefined,
        file: file || undefined,
        mediaType: file ? (file.type.startsWith("video/") ? "video" : "image") : undefined,
        bgColor: mode === "text" ? currentBg.bg : undefined,
        fontStyle: mode === "text" ? (currentFont.fontFamily || currentFont.style) : undefined,
      });
      resetAndClose();
    } catch {
      setError("Failed to post status.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setText("");
    setFile(null);
    setPreview(null);
    setError("");
    setMode("choose");
    setBgColorIdx(0);
    setFontIdx(0);
    onClose();
  };

  const cycleBg = () => setBgColorIdx((i) => (i + 1) % BG_COLORS.length);
  const cycleFont = () => setFontIdx((i) => (i + 1) % FONT_STYLES.length);

  const hasContent = !!text.trim() || !!file;

  const fontCss: React.CSSProperties = currentFont.fontFamily
    ? { fontFamily: currentFont.fontFamily }
    : {};

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
          onClick={resetAndClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl w-[500px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <h3 className="font-semibold text-lg text-gray-800">
                {mode === "choose" ? "Add status update" : mode === "text" ? "Text status" : "Photo / Video status"}
              </h3>
              <button type="button" onClick={resetAndClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Choose mode */}
            {mode === "choose" && (
              <div className="p-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-gray-200 hover:bg-[#f0faf7] hover:border-[#00a884] transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
                    <Type className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-800 group-hover:text-[#00a884]">Text</p>
                    <p className="text-xs text-gray-500">Share what&apos;s on your mind</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("media"); setTimeout(() => fileInputRef.current?.click(), 100); }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-gray-200 hover:bg-[#f0faf7] hover:border-[#00a884] transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-800 group-hover:text-[#00a884]">Photo</p>
                    <p className="text-xs text-gray-500">Share a photo from your device</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("media"); setTimeout(() => fileInputRef.current?.click(), 100); }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-gray-200 hover:bg-[#f0faf7] hover:border-[#00a884] transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#128C7E] flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-800 group-hover:text-[#00a884]">Video</p>
                    <p className="text-xs text-gray-500">Share a video of any length</p>
                  </div>
                </button>
              </div>
            )}

            {/* Text mode */}
            {mode === "text" && (
              <div className="flex flex-col">
                {/* Live preview */}
                <div
                  className="relative flex items-center justify-center min-h-[280px] transition-all duration-300"
                  style={bgStyle}
                >
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a status..."
                    maxLength={255}
                    className={`w-full text-center text-white bg-transparent border-none outline-none resize-none placeholder-white/50 px-8 py-4 text-xl leading-relaxed ${currentFont.style}`}
                    style={{ ...fontCss, minHeight: "120px" }}
                    rows={4}
                    autoFocus
                  />
                  <p className="absolute bottom-2 right-3 text-white/40 text-xs">{text.length}/255</p>
                </div>

                {/* Controls bar */}
                <div className="px-4 py-3 bg-gray-50 flex items-center gap-3 border-t">
                  {/* Color picker */}
                  <button
                    type="button"
                    onClick={cycleBg}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Change background color"
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                      style={bgStyle}
                    />
                    <Palette className="w-4 h-4 text-gray-600" />
                  </button>

                  {/* Color swatches row */}
                  <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide py-1">
                    {BG_COLORS.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setBgColorIdx(i)}
                        className={`w-6 h-6 rounded-full shrink-0 border-2 transition-all ${
                          i === bgColorIdx ? "border-gray-800 scale-110" : "border-transparent hover:border-gray-300"
                        }`}
                        style={
                          c.bg.startsWith("linear-gradient")
                            ? { backgroundImage: c.bg }
                            : { backgroundColor: c.bg }
                        }
                        title={c.label}
                      />
                    ))}
                  </div>

                  {/* Font picker */}
                  <button
                    type="button"
                    onClick={cycleFont}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                    title="Change font"
                  >
                    <span
                      className={`text-sm font-semibold text-gray-700 ${currentFont.style}`}
                      style={fontCss}
                    >
                      {currentFont.preview}
                    </span>
                    <span className="text-[10px] text-gray-500">{currentFont.label}</span>
                  </button>
                </div>

                {error && <p className="text-sm text-red-600 px-4 py-1">{error}</p>}
              </div>
            )}

            {/* Media mode */}
            {mode === "media" && (
              <div className="p-5 space-y-5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/ogg,video/mov,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {preview && isVideo && (
                  <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg ring-1 ring-black/10">
                    <video src={preview} controls className="w-full max-h-[320px] object-contain" />
                  </div>
                )}
                {preview && !isVideo && (
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-lg ring-1 ring-gray-200/50">
                    <img src={preview} alt="Preview" className="w-full max-h-[320px] object-contain" />
                  </div>
                )}
                {!preview && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-[220px] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-50 to-white hover:border-[#00a884] hover:from-[#f0fdf9] hover:to-[#ecfdf5] hover:shadow-lg hover:shadow-[#00a884]/10 transition-all duration-200 group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00a884]/20 to-[#128C7E]/20 flex items-center justify-center group-hover:from-[#00a884]/30 group-hover:to-[#128C7E]/30 transition-colors">
                      <ImageIcon className="w-8 h-8 text-[#00a884]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-[#00a884] transition-colors">Click to select a photo or video</p>
                      <p className="text-xs text-gray-400 mt-0.5">Images and videos supported (no size limit)</p>
                    </div>
                  </button>
                )}
                {file && (
                  <div className="flex items-center gap-3 bg-gray-50/80 rounded-xl px-4 py-3 border border-gray-100">
                    <div className="w-9 h-9 rounded-lg bg-[#00a884]/10 flex items-center justify-center shrink-0">
                      {isVideo ? <Video className="w-4 h-4 text-[#00a884]" /> : <ImageIcon className="w-4 h-4 text-[#00a884]" />}
                    </div>
                    <p className="text-sm text-gray-700 truncate flex-1 font-medium">
                      {file.name}
                    </p>
                    <span className="text-xs text-gray-500 shrink-0">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setPreview(null); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Caption (optional)</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#00a884]/30 focus:border-[#00a884] resize-none text-gray-800 placeholder-gray-400 transition-shadow"
                    rows={2}
                    maxLength={255}
                  />
                  <p className="text-xs text-gray-400 text-right">{text.length}/255</p>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
              </div>
            )}
            </div>

            {/* Footer */}
            {mode !== "choose" && (
              <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex justify-between items-center gap-3 bg-gray-50/30">
                <button
                  type="button"
                  onClick={() => {
                    setMode("choose");
                    setFile(null);
                    setPreview(null);
                    setText("");
                    setError("");
                    setBgColorIdx(0);
                    setFontIdx(0);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors"
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !hasContent}
                    className="px-6 py-2.5 bg-[#00a884] text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-[#008f70] active:scale-[0.98] transition-all shadow-sm shadow-[#00a884]/20"
                  >
                    {loading ? "Posting…" : "Post"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
