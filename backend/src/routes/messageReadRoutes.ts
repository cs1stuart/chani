import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as messageController from "../controllers/messageController.js";

const router = Router();
router.get("/:messageId/reaction-reactors", auth, messageController.getReactionReactors);
router.get("/:messageId", auth, messageController.getMessageReads);
export default router;
