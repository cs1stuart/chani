import { Request, Response } from "express";
import * as authService from "../services/authService.js";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const result = await authService.login(email, password);
    if (!result) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    res.json(result);
  } catch (err: unknown) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}
