import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // Privacy
    privacy: {
      last_seen: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      profile_photo: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      about: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      read_receipts: { type: Boolean, default: true },
      blocked_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      live_location: { type: Boolean, default: false },
    },
    // Security
    security: {
      two_step_enabled: { type: Boolean, default: false },
      two_step_pin: String,
    },
    // Chats
    chats: {
      last_backup_at: Date,
      enter_to_send: { type: Boolean, default: false },
      media_visibility: { type: Boolean, default: true },
      wallpaper: { type: String, default: "default" },
      wallpaper_color: String,
    },
    // Notifications
    notifications: {
      messages_enabled: { type: Boolean, default: true },
      message_tone: { type: String, default: "default" },
      message_vibrate: { type: Boolean, default: true },
      message_popup: { type: Boolean, default: true },
      group_enabled: { type: Boolean, default: true },
      group_tone: { type: String, default: "default" },
      group_vibrate: { type: Boolean, default: true },
      call_ringtone: { type: String, default: "default" },
      call_vibrate: { type: Boolean, default: true },
    },
    // Data & storage
    storage: {
      auto_download_photos: { type: Boolean, default: true },
      auto_download_videos: { type: Boolean, default: false },
      auto_download_documents: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const UserSettings = mongoose.model("UserSettings", userSettingsSchema);
