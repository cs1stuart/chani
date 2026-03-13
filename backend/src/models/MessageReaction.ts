import mongoose from "mongoose";

const messageReactionSchema = new mongoose.Schema(
  {
    message_id: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: { type: String, required: true },
  },
  { timestamps: true }
);
messageReactionSchema.index({ message_id: 1, user_id: 1 }, { unique: true });
messageReactionSchema.index({ message_id: 1 });

export const MessageReaction = mongoose.model("MessageReaction", messageReactionSchema);
