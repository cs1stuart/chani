import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as groupController from "../controllers/groupController.js";

const router = Router();
router.get("/:userId", auth, groupController.getGroups);
router.post("/", auth, groupController.createGroup);
router.post("/:groupId/members", auth, groupController.addGroupMembers);
router.post("/:groupId/leave", auth, groupController.leaveGroup);
router.delete("/:groupId", auth, groupController.deleteGroup);
export default router;
