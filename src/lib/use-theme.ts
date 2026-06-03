import { useEffect, useState } from "react";

export const THEMES = [
  { id: "default", label: "Default" },
  { id: "dark",      label: "Dark" },
  { id: "arcade",    label: "Arcade" },
  { id: "synthwave", label: "Synthwave" },
  { id: "sunset",    label: "Sunset" },
  { id: "ocean",     label: "Ocean" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "arcade-theme";

function applyTheme(id: ThemeId) {
  const html = document.documentElement;
  THEMES.forEach((t) => html.classList.remove(`theme-${t.id}`));
  if (id !== "default") html.classList.add(`theme-${id}`);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return (saved as ThemeId) ?? "default";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved) { setThemeState(saved); applyTheme(saved); }
  }, []);

  const setTheme = (id: ThemeId) => {
    setThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyTheme(id);
  };

  return { theme, setTheme };
}
