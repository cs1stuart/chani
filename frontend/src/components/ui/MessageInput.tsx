import React, { useRef, useState } from "react";
import { Send, Smile, Paperclip, X, Mic, Square } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { User, Message } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { formatMessagePreview } from "@/lib/utils";

interface Props {
  currentUser: User;
  users: User[];
  inputValue: string;
  setInputValue: (v: string) => void;
  replyTo: Message | null;
  setReplyTo: (v: Message | null) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  uploadingFile: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSendMessage: (e?: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVoiceSend: (blob: Blob) => void;
}

export default function MessageInput({
  currentUser,
  users,
  inputValue,
  setInputValue,
  replyTo,
  setReplyTo,
  showEmojiPicker,
  setShowEmojiPicker,
  uploadingFile,
  inputRef,
  onSendMessage,
  onFileUpload,
  onVoiceSend,
}: Props) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInputValue(inputValue + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) onVoiceSend(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      showToast("Could not access microphone.", "error");
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    setRecording(false);
  };

  return (
    <>
      {replyTo && (
        <div className="px-4 py-2 bg-[#f0f2f5] border-b border-gray-200">
          <div className="bg-white rounded-lg p-3 flex items-start gap-3 border-l-4 border-[#00a884]">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#00a884]">
                {replyTo.sender_id === currentUser.id
                  ? "You"
                  : replyTo.sender_name ||
                  users.find((u) => u.id === replyTo.sender_id)?.username ||
                  "User"}
              </p>
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {formatMessagePreview(replyTo)}
              </p>
            </div>
            {replyTo.type === "image" && (
              <img
                src={replyTo.content}
                alt=""
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            )}
            <button
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="p-3 bg-[#f0f2f5] flex items-end gap-3 relative">
        <div className="flex items-center gap-2 pb-1.5">
          <button
            className={`text-gray-500 hover:text-gray-700 transition-colors ${showEmojiPicker ? "text-[#00a884]" : ""}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={24} />
          </button>
          <button
            className={`text-gray-500 hover:text-gray-700 ${uploadingFile ? "animate-pulse text-[#00a884]" : ""}`}
            onClick={() => !uploadingFile && fileInputRef.current?.click()}
            disabled={uploadingFile}
          >
            <Paperclip size={24} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={onFileUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.mp4,.mp3,.wav"
          />
        </div>

        {uploadingFile && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600 font-medium">
              Uploading file...
            </span>
          </div>
        )}

        <div className="flex-1 flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? "Type your reply..." : "Type a message"}
            className="flex-1 px-4 py-2 bg-white rounded-lg outline-none text-sm resize-none overflow-y-auto leading-5"
            rows={1}
            style={{ maxHeight: 120, minHeight: 36 }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
            onFocus={() => setShowEmojiPicker(false)}
          />
          {inputValue.trim().length === 0 ? (
            <button
              type="button"
              onClick={() => (recording ? stopRecording() : startRecording())}
              disabled={uploadingFile}
              className={`p-2 rounded-full transition-colors flex-shrink-0 mb-0.5 ${
                recording ? "bg-red-500 text-white" : "bg-[#00a884] text-white"
              }`}
            >
              {recording ? <Square size={20} /> : <Mic size={20} />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSendMessage()}
              disabled={!inputValue.trim()}
              className={`p-2 rounded-full transition-colors flex-shrink-0 mb-0.5 ${
                inputValue.trim() ? "bg-[#00a884] text-white" : "text-gray-400"
              }`}
            >
              <Send size={20} />
            </button>
          )}
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 z-50">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}
      </div>
    </>
  );
}
