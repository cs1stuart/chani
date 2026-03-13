import { Router } from "express";
import * as authController from "../controllers/authController.js";

const router = Router();
router.post("/", authController.login);
export default router;
