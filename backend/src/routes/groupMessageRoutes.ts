import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as messageController from "../controllers/messageController.js";

const router = Router();
router.get("/:groupId", auth, messageController.getGroupMessages);
export default router;
