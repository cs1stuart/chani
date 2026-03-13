import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    media_url: { type: String, default: "" },
    media_type: { type: String, enum: ["image", "video", ""], default: "" },
    text: { type: String, default: "" },
    bg_color: { type: String, default: "" },
    font_style: { type: String, default: "" },
    expires_at: { type: Date, required: true },
    views: {
      type: [
        {
          viewer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          viewed_at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

statusSchema.index({ expires_at: 1 });
statusSchema.index({ user_id: 1, expires_at: 1 });

export const Status = mongoose.model("Status", statusSchema);

