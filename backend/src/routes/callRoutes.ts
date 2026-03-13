import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as callController from "../controllers/callController.js";

const router = Router();

router.get("/:userId", auth, callController.getCalls);
router.post("/", auth, callController.logCall);
router.post("/group", auth, callController.logGroupCall);

export default router;

