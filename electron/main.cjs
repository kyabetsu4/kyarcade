const { app, BrowserWindow, ipcMain, dialog, protocol } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const isDev = process.env.NODE_ENV === "development";
const VITE_PORT = 8080;

let esProcess = null;
let mainWindow = null;

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

  mainWindow = win;
}

function ensureAutostart() {
  // Only applies when running as a packaged AppImage on Linux
  const appImagePath = process.env.APPIMAGE;
  if (!appImagePath || process.platform !== "linux") return;

  const fs = require("fs");
  const os = require("os");
  const autostartDir = path.join(os.homedir(), ".config", "autostart");
  const desktopFile = path.join(autostartDir, "kyarcade.desktop");

  if (fs.existsSync(desktopFile)) return; // already registered

  try {
    fs.mkdirSync(autostartDir, { recursive: true });
    fs.writeFileSync(
      desktopFile,
      [
        "[Desktop Entry]",
        "Type=Application",
        "Name=kyarcade",
        `Exec=${appImagePath}`,
        "Hidden=false",
        "NoDisplay=false",
        "X-GNOME-Autostart-enabled=true",
      ].join("\n") + "\n",
    );
  } catch (e) {
    console.error("kyarcade: failed to write autostart entry:", e);
  }
}

app.whenReady().then(() => {
  ensureAutostart();
  protocol.registerFileProtocol("arcade", (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace("arcade://", "/"));
    callback({ path: filePath });
  });
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const DEFAULT_SAVE_PATHS = ["Emulation/saves", "Emulation/states"];

function getAdvancedConfigPath(home) {
  return path.join(home, "es-profiles", "kyarcade.json");
}

function loadAdvancedConfig(home) {
  const fs = require("fs");
  try {
    return JSON.parse(fs.readFileSync(getAdvancedConfigPath(home), "utf8"));
  } catch {
    return { savePaths: DEFAULT_SAVE_PATHS };
  }
}

function getFirstProfileRomDir(fs, home, fallback) {
  try {
    const profilesDir = path.join(home, "es-profiles");
    const entries = fs.readdirSync(profilesDir).filter((e) => {
      try {
        return fs.statSync(path.join(profilesDir, e)).isDirectory() && e !== "__new";
      } catch { return false; }
    }).sort();
    for (const entry of entries) {
      const settingsFile = path.join(profilesDir, entry, "ES-DE", "settings", "es_settings.xml");
      if (fs.existsSync(settingsFile)) {
        const xml = fs.readFileSync(settingsFile, "utf8");
        const match = xml.match(/name="ROMDirectory" value="([^"]+)"/);
        if (match && match[1]) return match[1];
      }
    }
  } catch {}
  return fallback;
}

function swapSaveSymlink(fs, home, profileId, relativePath) {
  const targetPath = path.join(home, relativePath);
  const profileStorage = path.join(home, "es-profiles", profileId, relativePath);

  fs.mkdirSync(profileStorage, { recursive: true });

  let targetIsReal = false;
  let targetIsSymlink = false;
  try {
    const stat = fs.lstatSync(targetPath);
    targetIsSymlink = stat.isSymbolicLink();
    targetIsReal = !targetIsSymlink && stat.isDirectory();
  } catch {}

  if (targetIsReal) {
    const isEmpty = fs.readdirSync(profileStorage).length === 0;
    if (isEmpty) {
      for (const entry of fs.readdirSync(targetPath)) {
        fs.renameSync(path.join(targetPath, entry), path.join(profileStorage, entry));
      }
    }
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else if (targetIsSymlink) {
    fs.unlinkSync(targetPath);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.symlinkSync(profileStorage, targetPath);
}

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
    // New profile — pick ROM directory
    const newProfileRomDir = syncRomDir
      ? getFirstProfileRomDir(fs, home, romDir)
      : romDir;
    fs.writeFileSync(
      esSettingsFile,
      `<?xml version="1.0"?>\n<settings>\n    <string name="ROMDirectory" value="${newProfileRomDir}" />\n</settings>\n`,
    );
  } else {
    // Existing profile — always correct the ROM directory regardless of current value
    let xml = fs.readFileSync(esSettingsFile, "utf8");
    if (xml.includes('name="ROMDirectory"')) {
      xml = xml.replace(/name="ROMDirectory" value="[^"]*"/, `name="ROMDirectory" value="${romDir}"`);
    } else {
      // Entry missing entirely — inject it
      xml = xml.replace("</settings>", `    <string name="ROMDirectory" value="${romDir}" />\n</settings>`);
    }
    fs.writeFileSync(esSettingsFile, xml);
  }

  fs.rmSync(esConfigDir, { recursive: true, force: true });
  fs.symlinkSync(profileDir, esConfigDir);

  const { savePaths, syncRomDir } = loadAdvancedConfig(home);
  for (const relativePath of savePaths) {
    swapSaveSymlink(fs, home, profileId, relativePath);
  }

  esProcess = spawn(esAppImage, [], {
    detached: false,
    stdio: "ignore",
    env: { ...process.env, HOME: home },
  });

  // Hide kyarcade while ES-DE is running so controller input doesn't bleed through
  if (mainWindow) mainWindow.hide();

  esProcess.once("exit", () => {
    esProcess = null;
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  return { ok: true };
});

ipcMain.handle("get-advanced-config", async () => {
  const home =
    process.env.HOME ||
    (() => {
      throw new Error("HOME environment variable is not set.");
    })();
  return loadAdvancedConfig(home);
});

ipcMain.handle("save-advanced-config", async (_event, config) => {
  const fs = require("fs");
  const home =
    process.env.HOME ||
    (() => {
      throw new Error("HOME environment variable is not set.");
    })();
  const profilesDir = path.join(home, "es-profiles");
  fs.mkdirSync(profilesDir, { recursive: true });
  fs.writeFileSync(getAdvancedConfigPath(home), JSON.stringify(config, null, 2));
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
          const profile = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
          // Convert raw absolute avatar paths to arcade:// URLs for the renderer
          if (profile.avatar && profile.avatar.startsWith("/")) {
            profile.avatar = `arcade://${profile.avatar}`;
          }
          return profile;
        } catch {
          return { id: d.name, name: d.name, avatar: null, tagline: "" };
        }
      });
    return dirs;
  } catch {
    return [];
  }
});

ipcMain.handle("list-subdirs", async (_event, relativePath) => {
  const fs = require("fs");
  const home = process.env.HOME || "";
  const fullPath = path.join(home, relativePath.replace(/^~\//, ""));
  try {
    return fs
      .readdirSync(fullPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(relativePath.replace(/^~\//, ""), d.name));
  } catch {
    return [];
  }
});
