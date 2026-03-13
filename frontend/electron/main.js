const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const isDev = process.env.NODE_ENV !== "production" || process.env.ELECTRON_DEV;
const PORT = process.env.PORT || 3000;
const MAIN_URL = `http://localhost:${PORT}`;

let mainWindow = null;
let nextServer = null;

function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone");
  }
  return path.join(__dirname, "..", ".next", "standalone");
}

function startNextServer() {
  return new Promise((resolve) => {
    if (isDev) {
      resolve();
      return;
    }
    const serverDir = getStandaloneDir();
    nextServer = spawn("node", ["server.js"], {
      cwd: serverDir,
      env: { ...process.env, PORT: String(PORT), HOSTNAME: "127.0.0.1" },
    });
    nextServer.stdout?.on("data", () => {});
    nextServer.stderr?.on("data", () => {});
    const check = () => {
      fetch(MAIN_URL)
        .then(() => resolve())
        .catch(() => setTimeout(check, 200));
    };
    setTimeout(check, 500);
  });
}

function createWindow() {
  const iconPng = path.join(__dirname, "icon.png");
  const iconIco = path.join(__dirname, "icon.ico");
  const iconPath = fs.existsSync(iconIco) ? iconIco : iconPng;
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    ...(fs.existsSync(iconPath) && { icon: iconPath }),
  });

  mainWindow.loadURL(MAIN_URL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (nextServer) {
      nextServer.kill();
      nextServer = null;
    }
  });
}

app.whenReady().then(() => {
  startNextServer().then(createWindow);
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
