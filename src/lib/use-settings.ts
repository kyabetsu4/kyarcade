import { useEffect, useState } from "react";

export type Settings = {
  showCredits: boolean;
  skipBoot: boolean;
  bootMessage: string;
};

const DEFAULTS: Settings = { showCredits: true, skipBoot: false, bootMessage: "" };
const KEY = "arcade-settings";

function load(): Settings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function save(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    setSettings(load());
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  };

  return { settings, update };
}
