import mongoose from "mongoose";

const messageGroupSchema = new mongoose.Schema(
  {
    name: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    /** True when created for add-to-call only; exclude from chat list */
    for_call_only: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const MessageGroup = mongoose.model("MessageGroup", messageGroupSchema);
