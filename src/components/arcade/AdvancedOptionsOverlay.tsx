import { useEffect, useState } from "react";
import { isElectron } from "@/lib/arcade-bridge";
import { DEFAULT_ADVANCED_CONFIG, type AdvancedConfig } from "@/lib/arcade-bridge";

type Props = {
  onClose: () => void;
};

// Subdirectory names that default to per-profile
const PER_PROFILE_DEFAULTS = new Set([
  "saves", "states", "screenshots", "recordings",
  "downloads", "logs", "remaps", "playlists",
]);

function pathsToText(paths: string[]) {
  return paths.join("\n");
}

function textToPaths(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim().replace(/^~\//, ""))
    .filter(Boolean);
}

export function AdvancedOptionsOverlay({ onClose }: Props) {
  const [config, setConfig] = useState<AdvancedConfig>(DEFAULT_ADVANCED_CONFIG);
  const [pathsText, setPathsText] = useState(pathsToText(DEFAULT_ADVANCED_CONFIG.savePaths));
  const [newPasscode, setNewPasscode] = useState("");
  const [saved, setSaved] = useState(false);

  // RetroArch helper state
  const [raPath, setRaPath] = useState(".var/app/org.libretro.RetroArch");
  const [raScanned, setRaScanned] = useState<string[]>([]);
  const [raChecked, setRaChecked] = useState<Set<string>>(new Set());
  const [raScanning, setRaScanning] = useState(false);
  const [raError, setRaError] = useState("");

  useEffect(() => {
    if (isElectron()) {
      window.arcade!.getAdvancedConfig().then((c) => {
        setConfig(c);
        setPathsText(pathsToText(c.savePaths));
        if (c.retroarchPath) setRaPath(c.retroarchPath);
      });
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const scan = async () => {
    if (!isElectron()) return;
    setRaScanning(true);
    setRaError("");
    setRaScanned([]);
    const trimmed = raPath.trim().replace(/^~\//, "");
    const subdirs = await window.arcade!.listSubdirs(trimmed);
    if (subdirs.length === 0) {
      setRaError("No subdirectories found — check the path.");
    } else {
      setRaScanned(subdirs);
      const current = new Set(textToPaths(pathsText));
      const defaults = new Set(
        subdirs.filter((p) => {
          const name = p.split("/").pop() ?? "";
          return PER_PROFILE_DEFAULTS.has(name) || current.has(p);
        }),
      );
      setRaChecked(defaults);
    }
    setRaScanning(false);
  };

  // Depth of a path relative to the scan root
  const raBase = raPath.trim().replace(/^~\//, "");
  const depthOf = (p: string) => {
    const rel = p.startsWith(raBase) ? p.slice(raBase.length) : p;
    return rel.split("/").filter(Boolean).length - 1;
  };

  const applyRaSelection = () => {
    const current = textToPaths(pathsText);
    // Remove any previously scanned paths, then add currently checked ones
    const scannedSet = new Set(raScanned);
    const filtered = current.filter((p) => !scannedSet.has(p));
    const merged = [...filtered, ...Array.from(raChecked)];
    setPathsText(pathsToText(merged));
    setSaved(false);
  };

  const save = async () => {
    const toSave: AdvancedConfig = {
      ...config,
      savePaths: textToPaths(pathsText),
      retroarchPath: raPath.trim().replace(/^~\//, "") || undefined,
      ...(newPasscode.trim() ? { advancedPasscode: newPasscode.trim() } : {}),
    };
    if (isElectron()) await window.arcade!.saveAdvancedConfig(toSave);
    setConfig(toSave);
    setPathsText(pathsToText(toSave.savePaths));
    setNewPasscode("");
    setSaved(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-primary bg-card p-10 shadow-2xl flex flex-col gap-6">
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">Advanced</p>
          <h2 className="mt-2 font-display text-3xl font-black">Advanced Options</h2>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground px-1">
            Profile Modifications
          </p>
          {(
            [
              { key: "allowRename", label: "Allow Rename" },
              { key: "allowTagline", label: "Allow Set Tagline" },
              { key: "allowAvatar", label: "Allow Change Avatar" },
              { key: "allowDelete", label: "Allow Delete" },
              { key: "requirePasskeys", label: "Require Profile Passkeys" },
              { key: "syncRomDir", label: "Copy ROM Directory to New Profiles" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setConfig((c) => ({ ...c, [key]: !c[key] })); setSaved(false); }}
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-5 py-3 hover:border-primary/50 transition-colors"
            >
              <span className="font-mono text-sm text-foreground">{label}</span>
              <div className={`relative h-6 w-10 rounded-full transition-colors ${config[key] ? "bg-primary" : "bg-border"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config[key] ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </button>
          ))}
        </div>

        {/* Admin passcode */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground px-1">
            Admin Passcode
            <span className="ml-2 normal-case tracking-normal">— required to open Advanced Options</span>
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="password"
              value={newPasscode}
              onChange={(e) => { setNewPasscode(e.target.value); setSaved(false); }}
              placeholder={config.advancedPasscode ? "••••  (set — type to change)" : "Leave blank to disable"}
              className="flex-1 rounded-2xl border border-border bg-background px-5 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            {config.advancedPasscode && (
              <button
                type="button"
                onClick={() => { setConfig((c) => ({ ...c, advancedPasscode: undefined })); setNewPasscode(""); setSaved(false); }}
                className="rounded-2xl border border-destructive/40 px-3 py-3 font-mono text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* RetroArch helper */}
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground px-1">
            RetroArch Helper
            <span className="ml-2 normal-case tracking-normal">— scan folders to pick per-profile saves</span>
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground pointer-events-none select-none">~/</span>
              <input
                type="text"
                value={raPath}
                onChange={(e) => { setRaPath(e.target.value); setRaScanned([]); setRaError(""); }}
                placeholder=".var/app/org.libretro.RetroArch"
                className="w-full rounded-2xl border border-border bg-background pl-9 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={scan}
              disabled={raScanning}
              className="rounded-2xl border border-primary bg-primary/10 px-5 py-3 font-mono text-sm text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
            >
              {raScanning ? "Scanning…" : "Scan"}
            </button>
          </div>

          {raError && (
            <p className="font-mono text-xs text-destructive px-1">{raError}</p>
          )}

          {raScanned.length > 0 && (
            <div className="flex flex-col gap-1 rounded-2xl border border-border bg-background p-4 max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Folder</span>
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Per Profile</span>
              </div>
              {raScanned.map((p) => {
                const name = p.split("/").pop() ?? p;
                const checked = raChecked.has(p);
                const depth = depthOf(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setRaChecked((prev) => {
                        const next = new Set(prev);
                        if (next.has(p)) next.delete(p); else next.add(p);
                        return next;
                      });
                    }}
                    className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors"
                    style={{ paddingLeft: `${12 + depth * 20}px` }}
                  >
                    <div className="flex items-center gap-2">
                      {depth > 0 && (
                        <span className="text-muted-foreground/30 font-mono text-xs select-none">{"└"}</span>
                      )}
                      <span className={`font-mono text-sm ${depth === 0 ? "text-foreground font-bold" : "text-foreground"}`}>
                        {name}
                      </span>
                    </div>
                    <div className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={applyRaSelection}
                className="mt-2 rounded-2xl border border-primary bg-primary/10 px-5 py-2 font-mono text-sm text-primary hover:bg-primary/20 transition-colors"
              >
                Apply to Save Paths ↓
              </button>
            </div>
          )}
        </div>

        {/* Save paths textarea */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground px-1">
            Save Paths
            <span className="ml-2 normal-case tracking-normal">— one per line, relative to $HOME</span>
          </p>
          <textarea
            value={pathsText}
            onChange={(e) => { setPathsText(e.target.value); setSaved(false); }}
            rows={5}
            spellCheck={false}
            placeholder={"Emulation/saves\nEmulation/states"}
            className="w-full rounded-2xl border border-border bg-background px-5 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-border px-6 py-3 font-mono text-sm text-foreground hover:border-primary/50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-2xl border border-primary bg-primary px-6 py-3 font-mono text-sm text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {saved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
