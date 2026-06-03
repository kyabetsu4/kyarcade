import { useEffect, useRef, useState } from "react";
import { getGamepad } from "@/lib/arcade-bridge";

type Props = {
  title: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel: () => void;
  check: (pin: string) => boolean;
};

export function PinEntryOverlay({ title, subtitle, onSuccess, onCancel, check }: Props) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastB = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // B button to cancel
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const bNow = !!pad.buttons[1]?.pressed;
        if (bNow && !lastB.current) onCancel();
        lastB.current = bNow;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onCancel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = () => {
    if (check(value)) {
      onSuccess();
    } else {
      setWrong(true);
      setValue("");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { setWrong(false); inputRef.current?.focus(); }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className={`w-full max-w-sm rounded-3xl border-2 ${wrong ? "border-destructive" : "border-primary"} bg-card p-10 shadow-2xl flex flex-col gap-6 transition-colors duration-200`}>
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">Passcode Required</p>
          <h2 className="mt-2 font-display text-3xl font-black">{title}</h2>
          {subtitle && <p className="mt-2 font-mono text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="••••"
          className={`w-full rounded-2xl border-2 bg-background px-5 py-3 text-center font-display text-xl font-bold tracking-[0.4em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:outline-none transition-colors
            ${wrong ? "border-destructive" : "border-border focus:border-primary"}`}
        />

        {wrong && <p className="text-center font-mono text-sm text-destructive">Wrong passcode</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-border px-4 py-3 font-display text-sm font-bold text-foreground hover:border-primary/50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={value.length === 0}
            className="flex-1 rounded-2xl border border-primary bg-primary px-4 py-3 font-display text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
