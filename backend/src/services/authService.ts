import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { sanitize, getAvatar, toId } from "../utils/helpers.js";

const JWT_SECRET = process.env.JWT_SECRET || "workchat-change-this-secret-in-production";

export interface LoginResult {
  id: string;
  username: string;
  avatar: string;
  about: string;
  token: string;
}

export async function login(email: string, password: string): Promise<LoginResult | null> {
  const user = await User.findOne({ email: sanitize(email), status: "active" }).lean();
  if (!user || !(user as { password?: string }).password) return null;
  const hash = (user as { password: string }).password.replace(/^\$2y\$/, "$2a$");
  const isValid = await bcrypt.compare(password, hash);
  if (!isValid) return null;
  await User.updateOne(
    { _id: user._id },
    { $set: { chat_status: "online", is_online: 1, last_login: new Date(), updatedAt: new Date() } }
  );
  const u = user as { _id: unknown; email: string; first_name?: string; last_name?: string; image?: string; about?: string };
  const token = jwt.sign({ id: toId(u._id), email: u.email }, JWT_SECRET, { expiresIn: "24h" });
  const username = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return {
    id: toId(u._id),
    username: username || u.email,
    avatar: getAvatar(u.image || null, u.first_name || "User"),
    about: u.about || "Hey there! I am using WorkChat.",
    token,
  };
}
