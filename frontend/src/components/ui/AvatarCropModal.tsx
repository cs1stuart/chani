"use client";

import React, { useState, useCallback, useEffect } from "react";
import Cropper, { Area, Point } from "react-easy-crop";

interface AvatarCropModalProps {
  imageUrl: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith("blob:") && !url.startsWith("data:")) image.crossOrigin = "anonymous";
    image.src = url;
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
  });
}

async function getCroppedImg(
  imageSrc: string,
  croppedPixels: Area
): Promise<Blob | null> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = croppedPixels.width;
    canvas.height = croppedPixels.height;

    ctx.drawImage(
      image,
      croppedPixels.x,
      croppedPixels.y,
      croppedPixels.width,
      croppedPixels.height,
      0,
      0,
      croppedPixels.width,
      croppedPixels.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });
  } catch (e) {
    console.error("Crop error:", e);
    return null;
  }
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export default function AvatarCropModal({ imageUrl, onCrop, onCancel }: AvatarCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    const t = setTimeout(() => setIsReady(true), 150);
    return () => clearTimeout(t);
  }, [imageUrl]);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDone = useCallback(async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(imageUrl, croppedAreaPixels);
    if (blob) onCrop(blob);
    onCancel();
  }, [imageUrl, croppedAreaPixels, onCrop, onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Crop profile photo</h2>
          <p className="text-sm text-gray-500 mt-0.5">Drag to move • Use slider to zoom in/out</p>
        </div>

        <div className="relative h-[360px] min-h-[280px] w-full bg-gray-900">
          {isReady && imageUrl ? (
            <Cropper
              key={imageUrl}
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              objectFit="cover"
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              zoomWithScroll={true}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">Loading image...</div>
          )}
        </div>

        {/* Zoom slider - WhatsApp style */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm shrink-0">Zoom</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 accent-[#00a884] cursor-pointer"
            />
            <span className="text-gray-500 text-sm shrink-0 w-10">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className="p-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-4 py-2 rounded-lg bg-[#00a884] text-white hover:bg-[#008f72]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
