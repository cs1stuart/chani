import mongoose from "mongoose";

const messageReadSchema = new mongoose.Schema(
  {
    message_id: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    read_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
messageReadSchema.index({ message_id: 1, user_id: 1 }, { unique: true });

export const MessageRead = mongoose.model("MessageRead", messageReadSchema);
