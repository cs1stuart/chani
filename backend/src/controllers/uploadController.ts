import { Request, Response } from "express";

export function handleUpload(req: Request, res: Response): void {
  const file = (req as Request & { file?: { filename: string; originalname: string; mimetype: string; size: number } }).file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const fileUrl = `/uploads/${file.filename}`;
  let type: "image" | "audio" | "video" | "file" = "file";
  if (file.mimetype.startsWith("image/")) {
    type = "image";
  } else if (file.mimetype.startsWith("video/")) {
    const name = file.originalname.toLowerCase();
    const isVoiceNote = name === "voice-message.webm" || name === "voice-message.ogg";
    type = isVoiceNote ? "audio" : "video";
  } else if (file.mimetype.startsWith("audio/")) {
    type = "audio";
  }
  res.json({ url: fileUrl, type, fileName: file.originalname, size: file.size });
}
