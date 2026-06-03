const { app, BrowserWindow, ipcMain, dialog, protocol } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const isDev = process.env.NODE_ENV === "development";
const VITE_PORT = 8080;

let esProcess = null;

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    frame: false,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(`http://localhost:${VITE_PORT}`);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.webContents.on("will-navigate", (e, url) => {
    const allowed = isDev ? `http://localhost:${VITE_PORT}` : "file://";
    if (!url.startsWith(allowed)) e.preventDefault();
  });
}

app.whenReady().then(() => {
  protocol.registerFileProtocol("arcade", (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace("arcade://", "/"));
    callback({ path: filePath });
  });
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("launch-profile", async (_event, profileId) => {
  const fs = require("fs");
  const home =
    process.env.HOME ||
    (() => {
      throw new Error("HOME environment variable is not set.");
    })();
  const profileDir = path.join(home, "es-profiles", profileId, "ES-DE");
  const esConfigDir = path.join(home, "ES-DE");
  const esAppImage = path.join(home, "Applications", "ES-DE.AppImage");
  const romDir = path.join(home, "Emulation", "roms");

  if (esProcess) {
    await new Promise((resolve) => {
      esProcess.once("exit", resolve);
      esProcess.kill("SIGTERM");
    });
    esProcess = null;
  }

  fs.mkdirSync(profileDir, { recursive: true });

  const esSettingsDir = path.join(profileDir, "settings");
  const esSettingsFile = path.join(esSettingsDir, "es_settings.xml");
  fs.mkdirSync(esSettingsDir, { recursive: true });
  if (!fs.existsSync(esSettingsFile)) {
    fs.writeFileSync(
      esSettingsFile,
      `<?xml version="1.0"?>\n<settings>\n    <string name="ROMDirectory" value="${romDir}" />\n</settings>\n`,
    );
  } else {
    let xml = fs.readFileSync(esSettingsFile, "utf8");
    if (xml.includes('name="ROMDirectory" value=""')) {
      xml = xml.replace('name="ROMDirectory" value=""', `name="ROMDirectory" value="${romDir}"`);
      fs.writeFileSync(esSettingsFile, xml);
    }
  }

  fs.rmSync(esConfigDir, { recursive: true, force: true });
  fs.symlinkSync(profileDir, esConfigDir);

  esProcess = spawn(esAppImage, [], {
    detached: false,
    stdio: "ignore",
    env: { ...process.env, HOME: home },
  });
  esProcess.once("exit", () => {
    esProcess = null;
  });
  return { ok: true };
});

ipcMain.handle("pick-avatar", async (_event, profileId) => {
  const fs = require("fs");
  const home =
    process.env.HOME ||
    (() => {
      throw new Error(
        "HOME environment variable is not set. Set it to your arcade user's home directory.",
      );
    })();

  const result = await dialog.showOpenDialog({
    title: "Choose Avatar Image",
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const src = result.filePaths[0];
  const ext = path.extname(src);
  const destDir = path.join(home, "es-profiles", profileId);
  const dest = path.join(destDir, `avatar${ext}`);

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);

  return dest;
});

ipcMain.handle("save-profile", async (_event, profile) => {
  const fs = require("fs");
  const home =
    process.env.HOME ||
    (() => {
      throw new Error(
        "HOME environment variable is not set. Set it to your arcade user's home directory.",
      );
    })();
  const profileDir = path.join(home, "es-profiles", profile.id);
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(path.join(profileDir, "ES-DE"), { recursive: true });
  fs.writeFileSync(path.join(profileDir, "profile.json"), JSON.stringify(profile, null, 2));
  return { ok: true };
});

ipcMain.handle("rename-profile", async (_event, profileId, newName) => {
  const fs = require("fs");
  const home =
    process.env.HOME ||
    (() => {
      throw new Error(
        "HOME environment variable is not set. Set it to your arcade user's home directory.",
      );
    })();
  const jsonPath = path.join(home, "es-profiles", profileId, "profile.json");
  const profile = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  profile.name = newName;
  fs.writeFileSync(jsonPath, JSON.stringify(profile, null, 2));
  return { ok: true };
});

ipcMain.handle("delete-profile", async (_event, profileId) => {
  const fs = require("fs");
  const home =
    process.env.HOME ||
    (() => {
      throw new Error(
        "HOME environment variable is not set. Set it to your arcade user's home directory.",
      );
    })();
  const profileDir = path.join(home, "es-profiles", profileId);
  fs.rmSync(profileDir, { recursive: true, force: true });
  return { ok: true };
});

ipcMain.handle("get-profiles", async () => {
  const fs = require("fs");
  const profilesDir = path.join(
    process.env.HOME ||
      (() => {
        throw new Error(
          "HOME environment variable is not set. Set it to your arcade user's home directory.",
        );
      })(),
    "es-profiles",
  );

  try {
    const dirs = fs
      .readdirSync(profilesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => {
        const jsonPath = path.join(profilesDir, d.name, "profile.json");
        try {
          return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        } catch {
          return { id: d.name, name: d.name, avatar: null, tagline: "" };
        }
      });
    return dirs;
  } catch {
    return [];
  }
});
