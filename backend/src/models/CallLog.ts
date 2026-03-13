import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    caller_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    callee_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["audio", "video"], default: "audio" },
    status: { type: String, enum: ["completed", "missed", "declined", "cancelled"], default: "completed" },
    duration: { type: Number, default: 0 }, // seconds
  },
  { timestamps: true }
);

callLogSchema.index({ callee_id: 1, createdAt: -1 });
callLogSchema.index({ caller_id: 1, createdAt: -1 });

export const CallLog = mongoose.model("CallLog", callLogSchema);

