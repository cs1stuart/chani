import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/index.js";
import { User } from "../models/User.js";

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  void (async () => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const doc = await User.findById(req.user.id).select("role").lean();
      const role = (doc as { role?: string } | null)?.role;
      if (!doc || role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  })();
}
