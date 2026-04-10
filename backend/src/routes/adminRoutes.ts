import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import * as adminController from "../controllers/adminController.js";

const router = Router();
router.use(auth);
router.use(requireAdmin);

router.get("/users", adminController.listUsers);
router.post("/users", adminController.createUser);
router.patch("/users/:userId", adminController.updateUser);
router.delete("/users/:userId", adminController.deleteUser);

export default router;
