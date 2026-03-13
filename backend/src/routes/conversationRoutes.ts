import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as conversationController from "../controllers/conversationController.js";

const router = Router();
router.get("/:userId", auth, conversationController.getConversations);
export default router;
