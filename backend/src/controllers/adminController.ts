import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import * as adminService from "../services/adminService.js";

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "10"), 10);
    const search = String(req.query.search || "");
    const result = await adminService.listUsersForAdminPaginated({ page, limit, search });
    res.json(result);
  } catch (err) {
    console.error("Admin list users:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };
    const created = await adminService.createUserByAdmin({
      email: email || "",
      password: password || "",
      name: name || "",
    });
    res.status(201).json(created);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create user";
    if (
      msg === "Email already registered" ||
      msg === "Email and name are required" ||
      msg === "Password must be at least 6 characters"
    ) {
      res.status(400).json({ error: msg });
      return;
    }
    console.error("Admin create user:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params as { userId: string };
    const { name, email, role, password } = req.body as {
      name?: string;
      email?: string;
      role?: "admin" | "employee";
      password?: string;
    };
    await adminService.updateUserByAdmin(req.user!.id, userId, {
      name,
      email,
      role,
      password,
    });
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update user";
    if (
      msg === "User not found" ||
      msg === "Invalid user id" ||
      msg === "Email already in use" ||
      msg === "Password must be at least 6 characters" ||
      msg === "Cannot demote the last admin"
    ) {
      res.status(400).json({ error: msg });
      return;
    }
    console.error("Admin update user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params as { userId: string };
    await adminService.deleteUserByAdmin(req.user!.id, userId);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete user";
    if (
      msg === "User not found" ||
      msg === "Invalid user id" ||
      msg === "You cannot delete your own account" ||
      msg === "Cannot delete the last admin"
    ) {
      res.status(400).json({ error: msg });
      return;
    }
    console.error("Admin delete user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
}
