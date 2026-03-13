import { Router, Request, Response, NextFunction } from "express";
import { auth } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import * as uploadController from "../controllers/uploadController.js";

const router = Router();
router.post(
  "/",
  auth,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err && (err as Error).message === "Request aborted") return;
      if (err) return next(err);
      next();
    });
  },
  uploadController.handleUpload
);
export default router;
