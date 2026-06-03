import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getGamepad } from "@/lib/arcade-bridge";
import { THEMES, type ThemeId } from "@/lib/use-theme";
import { OnScreenKeyboard } from "./OnScreenKeyboard";

const THEME_ICONS: Record<ThemeId, string> = {
  default:   "☀️",
  dark:      "🌙",
  arcade:    "👾",
  synthwave: "🌆",
  sunset:    "🌅",
  ocean:     "🌊",
};

function applyPreview(id: ThemeId) {
  const html = document.documentElement;
  THEMES.forEach((t) => html.classList.remove(`theme-${t.id}`));
  if (id !== "default") html.classList.add(`theme-${id}`);
}

type Section = "themes" | "credits" | "skip-boot" | "boot-message";

type Props = {
  current: ThemeId;
  onChange: (id: ThemeId) => void;
  showCredits: boolean;
  onCreditsToggle: (v: boolean) => void;
  skipBoot: boolean;
  onSkipBootToggle: (v: boolean) => void;
  bootMessage: string;
  onBootMessageChange: (v: string) => void;
  onClose: () => void;
  onEditingChange?: (editing: boolean) => void;
};

const TOGGLES: Section[] = ["credits", "skip-boot", "boot-message"];

export type SettingsOverlayHandle = { confirm: () => void; cancel: () => void };

export const SettingsOverlay = forwardRef<SettingsOverlayHandle, Props>(function SettingsOverlay({
  current, onChange, showCredits, onCreditsToggle,
  skipBoot, onSkipBootToggle, bootMessage, onBootMessageChange, onClose, onEditingChange,
}: Props, ref: React.Ref<SettingsOverlayHandle>) {
  const [preview, setPreview] = useState<ThemeId>(current);
  const [section, setSection] = useState<Section>("themes");
  const [hoverTheme, setHoverTheme] = useState<ThemeId | null>(null);
  const [editingMessage, setEditingMessage] = useState(false);
  const [draftMessage, setDraftMessage] = useState(bootMessage);
  const [replaceOnType, setReplaceOnType] = useState(false);
  const replaceOnTypeRef = useRef(false);

  const previewRef = useRef(preview);
  const sectionRef = useRef(section);
  const focusRef = useRef(THEMES.findIndex((t) => t.id === current));
  const showCreditsRef = useRef(showCredits);
  const skipBootRef = useRef(skipBoot);
  const onChangeRef = useRef(onChange);
  const onCloseRef = useRef(onClose);
  const onCreditsToggleRef = useRef(onCreditsToggle);
  const onSkipBootToggleRef = useRef(onSkipBootToggle);
  const editingMessageRef = useRef(editingMessage);

  previewRef.current = preview;
  sectionRef.current = section;
  showCreditsRef.current = showCredits;
  skipBootRef.current = skipBoot;
  onChangeRef.current = onChange;
  onCloseRef.current = onClose;
  onCreditsToggleRef.current = onCreditsToggle;
  onSkipBootToggleRef.current = onSkipBootToggle;
  editingMessageRef.current = editingMessage;

  const select = (id: ThemeId) => { previewRef.current = id; setPreview(id); };
  const commit = () => { applyPreview(previewRef.current); onChangeRef.current(previewRef.current); onCloseRef.current(); };
  const cancel = () => { onCloseRef.current(); };

  useImperativeHandle(ref, () => ({ confirm: commit, cancel }));

  const openEditMessage = () => {
    setDraftMessage(bootMessage);
    setReplaceOnType(true);
    replaceOnTypeRef.current = true;
    setEditingMessage(true);
    onEditingChange?.(true);
  };
  const closeEditMessage = () => { setEditingMessage(false); onEditingChange?.(false); };
  const confirmMessage = () => { onBootMessageChange(draftMessage); closeEditMessage(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingMessageRef.current) { if (e.key === "Escape") { e.preventDefault(); closeEditMessage(); } return; }
      const s = sectionRef.current;
      if (s === "themes") {
        if (e.key === "ArrowRight") { e.preventDefault(); focusRef.current = Math.min(THEMES.length - 1, focusRef.current + 1); select(THEMES[focusRef.current].id); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); focusRef.current = Math.max(0, focusRef.current - 1); select(THEMES[focusRef.current].id); }
        else if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = focusRef.current + 3;
          if (next >= THEMES.length) setSection("credits");
          else { focusRef.current = Math.min(THEMES.length - 1, next); select(THEMES[focusRef.current].id); }
        }
        else if (e.key === "ArrowUp") { e.preventDefault(); focusRef.current = Math.max(0, focusRef.current - 3); select(THEMES[focusRef.current].id); }
        else if (e.key === "Enter") { e.preventDefault(); commit(); }
      } else {
        const idx = TOGGLES.indexOf(s);
        if (e.key === "ArrowUp") { e.preventDefault(); idx === 0 ? setSection("themes") : setSection(TOGGLES[idx - 1]); }
        else if (e.key === "ArrowDown") { e.preventDefault(); if (idx < TOGGLES.length - 1) setSection(TOGGLES[idx + 1]); }
        else if (e.key === "Enter") {
          e.preventDefault();
          if (s === "credits") onCreditsToggleRef.current(!showCreditsRef.current);
          else if (s === "skip-boot") onSkipBootToggleRef.current(!skipBootRef.current);
          else if (s === "boot-message") openEditMessage();
        }
      }
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!("getGamepads" in navigator)) return;
    let raf = 0;
    const DEAD = 0.5;
    const initPad = getGamepad();
    let lastDirX = 0;
    let lastDirY = 0;
    let lastA = !!initPad?.buttons[0]?.pressed;
    let lastB = !!initPad?.buttons[1]?.pressed;

    const tick = () => {
      const pad = getGamepad();
      if (editingMessageRef.current) {
        const bNow = !!pad?.buttons[1]?.pressed;
        if (bNow && !lastB) { closeEditMessage(); }
        lastB = !!bNow;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (pad) {
        const s = sectionRef.current;
        const x = (pad.axes[0] ?? 0) + (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
        const y = (pad.axes[1] ?? 0) + (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
        const dirX = x > DEAD ? 1 : x < -DEAD ? -1 : 0;
        const dirY = y > DEAD ? 1 : y < -DEAD ? -1 : 0;

        if (s === "themes") {
          if (dirX !== 0 && dirX !== lastDirX) { focusRef.current = Math.max(0, Math.min(THEMES.length - 1, focusRef.current + dirX)); select(THEMES[focusRef.current].id); }
          if (dirY !== 0 && dirY !== lastDirY) {
            const next = focusRef.current + dirY * 3;
            if (dirY === 1 && next >= THEMES.length) setSection("credits");
            else { focusRef.current = Math.max(0, Math.min(THEMES.length - 1, next)); select(THEMES[focusRef.current].id); }
          }
        } else {
          const idx = TOGGLES.indexOf(s);
          if (dirY !== 0 && dirY !== lastDirY) {
            if (dirY === -1) idx === 0 ? setSection("themes") : setSection(TOGGLES[idx - 1]);
            else if (dirY === 1 && idx < TOGGLES.length - 1) setSection(TOGGLES[idx + 1]);
          }
        }
        lastDirX = dirX;
        lastDirY = dirY;

        const aNow = !!pad.buttons[0]?.pressed;
        if (aNow && !lastA) {
          if (s === "credits") onCreditsToggleRef.current(!showCreditsRef.current);
          else if (s === "skip-boot") onSkipBootToggleRef.current(!skipBootRef.current);
          else if (s === "boot-message") openEditMessage();
          else commit();
        }
        lastA = aNow;
        const bNow = !!pad.buttons[1]?.pressed;
        if (bNow && !lastB) cancel();
        lastB = bNow;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function Toggle({ value, label }: { value: boolean; label: string }) {
    return (
      <div className="flex w-full items-center justify-between">
        <span className="font-display text-base font-bold">{label}</span>
        <div className="flex items-center gap-3">
          <span className={`font-display text-sm font-bold ${value ? "text-primary" : "text-muted-foreground"}`}>{value ? "ON" : "OFF"}</span>
          <div className={`relative h-7 w-12 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}>
            <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
          </div>
        </div>
      </div>
    );
  }

  if (editingMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
        <div className="w-full max-w-4xl rounded-3xl border-2 border-primary bg-card px-12 py-10 shadow-2xl flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Boot Message</p>
            <div className="mt-3 min-h-14 flex items-center justify-center">
              <h2 className={`font-display text-3xl font-black uppercase tracking-widest transition-colors ${replaceOnType ? "text-muted-foreground/40" : "text-foreground"}`}>
                {draftMessage || <span className="text-muted-foreground/40">EMPTY</span>}
              </h2>
            </div>
            <span className="font-mono text-sm text-muted-foreground">{draftMessage.length}/32</span>
          </div>
          <OnScreenKeyboard
            onChar={(ch) => {
              if (replaceOnTypeRef.current) { replaceOnTypeRef.current = false; setReplaceOnType(false); setDraftMessage(ch); }
              else setDraftMessage((n) => (n + ch).slice(0, 32));
            }}
            onBackspace={() => { replaceOnTypeRef.current = false; setReplaceOnType(false); setDraftMessage((n) => n.slice(0, -1)); }}
            onConfirm={confirmMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-3xl border-2 border-primary bg-card p-10 shadow-2xl flex flex-col gap-8">
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">Settings</p>
          <h2 className="mt-2 font-display text-3xl font-black">Theme</h2>
        </div>

        <div className="grid grid-cols-3 gap-4" onMouseLeave={() => setHoverTheme(null)}>
          {THEMES.map((t) => {
            const active = (hoverTheme ?? preview) === t.id && section === "themes";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { focusRef.current = THEMES.indexOf(t); select(t.id); commit(); }}
                onMouseEnter={() => { focusRef.current = THEMES.indexOf(t); setSection("themes"); setHoverTheme(t.id); }}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all ${
                  active ? "border-primary scale-[1.04] bg-primary/10" : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <span className="text-5xl">{THEME_ICONS[t.id]}</span>
                <span className={`font-display text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {(["credits", "skip-boot", "boot-message"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSection(id);
              if (id === "credits") onCreditsToggle(!showCredits);
              else if (id === "skip-boot") onSkipBootToggle(!skipBoot);
              else openEditMessage();
            }}
            onMouseEnter={() => setSection(id)}
            className={`flex items-center justify-between rounded-2xl border-2 px-6 py-4 transition-all ${
              section === id ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-background hover:border-primary/50"
            }`}
          >
            {id === "credits" && <Toggle value={showCredits} label="Show Credits" />}
            {id === "skip-boot" && <Toggle value={skipBoot} label="Skip Boot Screen" />}
            {id === "boot-message" && (
              <div className="flex items-center justify-between w-full">
                <span className="font-display text-base font-bold">Boot Message</span>
                <span className="font-mono text-sm text-muted-foreground">{bootMessage || "None"}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});
