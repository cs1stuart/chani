import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as messageController from "../controllers/messageController.js";

const router = Router();
router.get("/:user1/:user2", auth, messageController.getMessages);
export default router;
