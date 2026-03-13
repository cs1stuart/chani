import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

dotenv.config();

import { connectDB } from "./config/db.js";
import app from "./app.js";
import { setupSocket } from "./socket/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3002", 10);

async function start(): Promise<void> {
  await connectDB();

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    maxHttpBufferSize: 1e7,
    cors: { origin: "*" },
  });
  (app as express.Express & { set: (k: string, v: unknown) => void }).set("io", io);
  setupSocket(io);

  if (process.env.NODE_ENV === "production") {
    const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
    if (fs.existsSync(frontendDist)) {
      app.use(express.static(frontendDist));
      app.get("*", (_req: express.Request, res: express.Response) => {
        res.sendFile(path.join(frontendDist, "index.html"));
      });
    }
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
