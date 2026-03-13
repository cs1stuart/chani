import mongoose from "mongoose";

const messageGroupMemberSchema = new mongoose.Schema(
  {
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: "MessageGroup" },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: { type: String, default: "member" },
  },
  { timestamps: true }
);

messageGroupMemberSchema.index({ user_id: 1 });
messageGroupMemberSchema.index({ group_id: 1, user_id: 1 });

export const MessageGroupMember = mongoose.model("MessageGroupMember", messageGroupMemberSchema);
