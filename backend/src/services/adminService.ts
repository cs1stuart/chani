import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { sanitize, toId } from "../utils/helpers.js";

export interface AdminUserRow {
  id: string;
  email: string;
  role: "admin" | "employee";
  /** Name the admin entered when creating the account (unchanged by employee profile edits until admin edits). */
  name_set_by_admin: string;
  /** Current profile name (first + last) — what the user set in settings. */
  current_display_name: string;
  created_at: string;
}

export interface AdminUserListResult {
  items: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapToAdminRow(u: Record<string, unknown>): AdminUserRow {
  const current =
    `${u.first_name || ""} ${u.last_name || ""}`.trim() || (u.email as string);
  const assigned = String(u.admin_assigned_name || "").trim();
  const nameSetByAdmin = assigned || current;
  return {
    id: toId(u._id),
    email: u.email as string,
    role: u.role === "admin" ? "admin" : "employee",
    name_set_by_admin: nameSetByAdmin,
    current_display_name: current,
    created_at: u.createdAt ? new Date(u.createdAt as Date).toISOString() : "",
  };
}

export async function listUsersForAdminPaginated(opts: {
  page: number;
  limit: number;
  search: string;
}): Promise<AdminUserListResult> {
  const page = Math.max(1, Math.floor(opts.page) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(opts.limit) || 10));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { status: "active" };
  const q = opts.search.trim();
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean);
    const fullNameExpr = {
      $trim: {
        input: {
          $concat: [{ $ifNull: ["$first_name", ""] }, " ", { $ifNull: ["$last_name", ""] }],
        },
      },
    };
    const orForToken = (token: string) => {
      const safeT = escapeRegex(token);
      const rx = new RegExp(safeT, "i");
      return {
        $or: [
          { email: rx },
          { first_name: rx },
          { last_name: rx },
          { admin_assigned_name: rx },
          {
            $expr: {
              $regexMatch: {
                input: fullNameExpr,
                regex: safeT,
                options: "i",
              },
            },
          },
        ],
      };
    };
    if (tokens.length > 1) {
      filter.$and = tokens.map(orForToken);
    } else {
      const t = tokens[0] ?? q;
      filter.$or = orForToken(t).$or;
    }
  }

  const [total, raw] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select("email first_name last_name role admin_assigned_name createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const items = (raw as Record<string, unknown>[]).map(mapToAdminRow);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return { items, total, page, limit, totalPages };
}

export async function createUserByAdmin(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ id: string; email: string }> {
  const email = sanitize(input.email);
  const nameRaw = sanitize(input.name);
  if (!email || !nameRaw || nameRaw.length < 1) {
    throw new Error("Email and name are required");
  }
  if (!input.password || input.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  const exists = await User.findOne({ email }).lean();
  if (exists) throw new Error("Email already registered");

  const nameTrim = nameRaw.trim();
  const nameParts = nameTrim.split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const hash = await bcrypt.hash(input.password, 10);

  const doc = await User.create({
    email,
    password: hash,
    first_name: firstName,
    last_name: lastName,
    admin_assigned_name: nameTrim,
    role: "employee",
    about: "Hey there! I am using WorkChat.",
    status: "active",
    chat_status: "offline",
    is_online: 0,
  });

  return { id: toId(doc._id), email };
}

export async function updateUserByAdmin(
  actorId: string,
  targetId: string,
  input: {
    name?: string;
    email?: string;
    role?: "admin" | "employee";
    password?: string;
  },
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(targetId)) throw new Error("Invalid user id");

  const target = await User.findOne({ _id: targetId, status: "active" }).lean();
  if (!target) throw new Error("User not found");

  const updates: Record<string, unknown> = {};

  if (input.password !== undefined && input.password !== "") {
    if (input.password.length < 6) throw new Error("Password must be at least 6 characters");
    updates.password = await bcrypt.hash(input.password, 10);
  }

  if (input.email !== undefined && input.email.trim()) {
    const email = sanitize(input.email);
    const dup = await User.findOne({
      email,
      _id: { $ne: new mongoose.Types.ObjectId(targetId) },
    }).lean();
    if (dup) throw new Error("Email already in use");
    updates.email = email;
  }

  if (input.name !== undefined && input.name.trim()) {
    const nameTrim = sanitize(input.name).trim();
    const nameParts = nameTrim.split(/\s+/);
    updates.first_name = nameParts[0] || "";
    updates.last_name = nameParts.slice(1).join(" ") || "";
    updates.admin_assigned_name = nameTrim;
  }

  if (input.role !== undefined) {
    const newRole = input.role === "admin" ? "admin" : "employee";
    const currentRole = (target as { role?: string }).role;
    if (currentRole === "admin" && newRole === "employee") {
      const n = await User.countDocuments({ status: "active", role: "admin" });
      if (n <= 1) throw new Error("Cannot demote the last admin");
    }
    updates.role = newRole;
  }

  if (Object.keys(updates).length === 0) return;

  await User.updateOne(
    { _id: new mongoose.Types.ObjectId(targetId) },
    { $set: { ...updates, updatedAt: new Date() } },
  );
}

export async function deleteUserByAdmin(actorId: string, targetId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(targetId)) throw new Error("Invalid user id");
  if (actorId === targetId) throw new Error("You cannot delete your own account");

  const target = await User.findOne({ _id: targetId, status: "active" }).lean();
  if (!target) throw new Error("User not found");

  if ((target as { role?: string }).role === "admin") {
    const n = await User.countDocuments({ status: "active", role: "admin" });
    if (n <= 1) throw new Error("Cannot delete the last admin");
  }

  await User.updateOne(
    { _id: new mongoose.Types.ObjectId(targetId) },
    {
      $set: {
        status: "inactive",
        chat_status: "offline",
        is_online: 0,
        updatedAt: new Date(),
      },
    },
  );
}
