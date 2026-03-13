import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as settingsController from "../controllers/settingsController.js";

const router = Router();

router.get("/", auth, settingsController.getSettings);
router.post("/update", auth, settingsController.updateSettings);
router.post("/backup", auth, settingsController.setLastBackup);
router.get("/blocked", auth, settingsController.getBlocked);
router.post("/blocked", auth, settingsController.addBlocked);
router.delete("/blocked/:userId", auth, settingsController.removeBlocked);

export default router;
