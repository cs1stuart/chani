import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import apiRoutes from "./routes/index.js";
import { getUploadsDir } from "./middlewares/upload.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests, slow down" },
});
app.use("/api/", apiLimiter);
app.use("/uploads", express.static(getUploadsDir()));

app.use("/api", apiRoutes);

export default app;
