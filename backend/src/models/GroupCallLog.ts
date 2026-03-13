import mongoose from "mongoose";

const groupCallLogSchema = new mongoose.Schema(
  {
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: "MessageGroup", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // participant who sees this in their history
    group_name: { type: String, default: "Group" },
    participant_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // all participants in the call
    type: { type: String, enum: ["audio", "video"], default: "video" },
    status: { type: String, enum: ["completed", "missed", "declined", "cancelled"], default: "completed" },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

groupCallLogSchema.index({ user_id: 1, createdAt: -1 });
groupCallLogSchema.index({ group_id: 1, createdAt: -1 });

export const GroupCallLog = mongoose.model("GroupCallLog", groupCallLogSchema);
