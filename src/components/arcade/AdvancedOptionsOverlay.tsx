import { useEffect, useState } from "react";
import { isElectron } from "@/lib/arcade-bridge";
import { DEFAULT_ADVANCED_CONFIG, type AdvancedConfig } from "@/lib/arcade-bridge";

type Props = {
  onClose: () => void;
};

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

  useEffect(() => {
    if (isElectron()) {
      window.arcade!.getAdvancedConfig().then((c) => {
        setConfig(c);
        setPathsText(pathsToText(c.savePaths));
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

  const save = async () => {
    const toSave: AdvancedConfig = {
      ...config,
      savePaths: textToPaths(pathsText),
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-3xl border-2 border-primary bg-card p-10 shadow-2xl flex flex-col gap-6">
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
