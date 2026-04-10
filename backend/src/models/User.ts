import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    first_name: String,
    last_name: String,
    email: { type: String, required: true, unique: true },
    password: String,
    image: String,
    about: { type: String, default: "Hey there! I am using WorkChat." },
    /** Set when admin creates the user; not changed when employee edits profile name. */
    admin_assigned_name: { type: String, default: "" },
    role: { type: String, enum: ["admin", "employee"], default: "employee" },
    status: { type: String, default: "active" },
    chat_status: { type: String, default: "offline" },
    is_online: { type: Number, default: 0 },
    last_login: Date,
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
