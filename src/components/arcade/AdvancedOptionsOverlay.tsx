import { useEffect, useRef, useState } from "react";
import { isElectron } from "@/lib/arcade-bridge";
import { DEFAULT_ADVANCED_CONFIG, type AdvancedConfig } from "@/lib/arcade-bridge";

type Props = {
  onClose: () => void;
};

export function AdvancedOptionsOverlay({ onClose }: Props) {
  const [config, setConfig] = useState<AdvancedConfig>(DEFAULT_ADVANCED_CONFIG);
  const [newPath, setNewPath] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isElectron()) {
      window.arcade!.getAdvancedConfig().then(setConfig);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const removePath = (i: number) => {
    setConfig((c) => ({ ...c, savePaths: c.savePaths.filter((_, idx) => idx !== i) }));
    setSaved(false);
  };

  const addPath = () => {
    const trimmed = newPath.trim().replace(/^~\//, "");
    if (!trimmed || config.savePaths.includes(trimmed)) return;
    setConfig((c) => ({ ...c, savePaths: [...c.savePaths, trimmed] }));
    setNewPath("");
    setSaved(false);
    inputRef.current?.focus();
  };

  const save = async () => {
    const toSave: AdvancedConfig = {
      ...config,
      ...(newPasscode.trim() ? { advancedPasscode: newPasscode.trim() } : {}),
    };
    if (isElectron()) await window.arcade!.saveAdvancedConfig(toSave);
    setConfig(toSave);
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
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setConfig((c) => ({ ...c, [key]: !c[key] }));
                setSaved(false);
              }}
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-5 py-3 hover:border-primary/50 transition-colors"
            >
              <span className="font-mono text-sm text-foreground">{label}</span>
              <div
                className={`relative h-6 w-10 rounded-full transition-colors ${config[key] ? "bg-primary" : "bg-border"}`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${config[key] ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground px-1">
            Admin Passcode
            <span className="ml-2 normal-case tracking-normal">
              — required to open Advanced Options
            </span>
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

        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground px-1">
            Save Paths
            <span className="ml-2 normal-case tracking-normal">
              — relative to $HOME, symlinked per profile
            </span>
          </p>
          {config.savePaths.length === 0 && (
            <p className="text-center font-mono text-sm text-muted-foreground py-4">
              No paths configured.
            </p>
          )}
          {config.savePaths.map((p, i) => (
            <div
              key={p}
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-5 py-3"
            >
              <span className="font-mono text-sm text-foreground">~/{p}</span>
              <button
                type="button"
                onClick={() => removePath(i)}
                className="ml-4 rounded-xl border border-destructive/40 px-3 py-1 font-mono text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground pointer-events-none">
              ~/
            </span>
            <input
              ref={inputRef}
              type="text"
              value={newPath}
              onChange={(e) => {
                setNewPath(e.target.value);
                setSaved(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") addPath();
              }}
              placeholder="Emulation/saves"
              className="w-full rounded-2xl border border-border bg-background pl-9 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={addPath}
            className="rounded-2xl border border-primary bg-primary/10 px-5 py-3 font-mono text-sm text-primary hover:bg-primary/20 transition-colors"
          >
            Add
          </button>
        </div>

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
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
