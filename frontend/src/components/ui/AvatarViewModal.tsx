"use client";

import { X } from "lucide-react";

interface Props {
  imageUrl: string;
  name?: string;
  onClose: () => void;
}

export default function AvatarViewModal({ imageUrl, name, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="presentation"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none"
        aria-label="Close"
      >
        <X size={24} />
      </button>
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={name || "Profile picture"}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg outline-none select-none"
          onClick={onClose}
          style={{ maxHeight: "90vh" }}
        />
      </div>
      {name && (
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white text-lg font-medium">
          {name}
        </p>
      )}
    </div>
  );
}
