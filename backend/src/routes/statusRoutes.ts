import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as statusController from "../controllers/statusController.js";

const router = Router();

router.get("/", auth, statusController.getStatuses);
router.post("/", auth, statusController.createStatus);
router.post("/:statusId/view", auth, statusController.recordView);
router.delete("/:statusId", auth, statusController.deleteStatus);

export default router;

