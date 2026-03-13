import mongoose from "mongoose";

const messageDeletionSchema = new mongoose.Schema(
  {
    message_id: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deleted_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
messageDeletionSchema.index({ message_id: 1, user_id: 1 }, { unique: true });

export const MessageDeletion = mongoose.model("MessageDeletion", messageDeletionSchema);
