import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    unique_id: String,
    timestamp: Number,
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    target: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: "MessageGroup" },
    text: String,
    type: { type: String, default: "text" },
    file_name: String,
    read_at: Date,
    deleted_at: Date,
    edited_at: Date,
  },
  { timestamps: true }
);

messageSchema.index({ creator: 1, target: 1, group_id: 1, deleted_at: 1, createdAt: -1 });
messageSchema.index({ target: 1, read_at: 1, group_id: 1, deleted_at: 1 });
messageSchema.index({ group_id: 1, deleted_at: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);
