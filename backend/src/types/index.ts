import { Request } from "express";

export interface JwtPayload {
  id: string;
  email: string;
  role?: "admin" | "employee";
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
