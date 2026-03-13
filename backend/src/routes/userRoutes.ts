import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import * as userController from "../controllers/userController.js";

const router = Router();
router.get("/", auth, userController.getUsers);
router.post("/update", auth, userController.updateProfile);
export default router;
