import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as groupController from "../controllers/groupController.js";

const router = Router();
router.get("/:groupId", auth, groupController.getGroupMembers);
export default router;
