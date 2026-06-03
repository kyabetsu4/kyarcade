import { useEffect, useRef, useState } from "react";
import { getGamepad } from "@/lib/arcade-bridge";

const BUTTON_LABELS: Record<number, string> = {
  0: "A", 1: "B", 2: "X", 3: "Y",
  4: "LB", 5: "RB", 6: "LT", 7: "RT",
  8: "Select", 9: "Start",
  10: "L3", 11: "R3",
  12: "↑", 13: "↓", 14: "←", 15: "→",
};

function buttonLabel(idx: number) {
  return BUTTON_LABELS[idx] ?? `Btn${idx}`;
}

function getPressedButtons(pad: Gamepad): number[] {
  return pad.buttons
    .map((b, i) => ({ pressed: b.value > 0.5, i }))
    .filter((x) => x.pressed)
    .map((x) => x.i);
}

function sortedKey(btns: number[]) {
  return [...btns].sort((a, b) => a - b).join(",");
}

export type PasskeyResult =
  | { type: "gamepad"; passkey: number[] }
  | { type: "pin"; pin: string };

type SetStage = "record" | "confirm";
type InputTab = "gamepad" | "keyboard";

type Props =
  | {
      mode: "set";
      profileName: string;
      onSet: (result: PasskeyResult) => void;
      onCancel: () => void;
    }
  | {
      mode: "enter";
      profileName: string;
      passkey?: number[];
      pin?: string;
      onSuccess: () => void;
      onCancel: () => void;
    };

// ── Gamepad set sub-component ──────────────────────────────────────────────

function GamepadSetPanel({ onSet, onCancel }: { onSet: (passkey: number[]) => void; onCancel: () => void }) {
  const [stage, setStage] = useState<SetStage>("record");
  const [recorded, setRecorded] = useState<number[]>([]);
  const [held, setHeld] = useState<number[]>([]);
  const [mismatch, setMismatch] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeld = useRef("");
  const lastB = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        // B to cancel
        const bNow = !!pad.buttons[1]?.pressed;
        if (bNow && !lastB.current) onCancel();
        lastB.current = bNow;

        const pressed = getPressedButtons(pad);
        const key = sortedKey(pressed);
        if (key !== lastHeld.current) {
          lastHeld.current = key;
          setHeld(pressed);
          if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
          if (pressed.length === 4) {
            holdTimer.current = setTimeout(() => {
              setStage((s) => {
                if (s === "record") {
                  const sorted = [...pressed].sort((a, b) => a - b);
                  setRecorded(sorted);
                  setHeld([]); lastHeld.current = "";
                  return "confirm";
                }
                if (s === "confirm") {
                  const attempt = [...pressed].sort((a, b) => a - b);
                  setRecorded((rec) => {
                    if (attempt.join(",") === rec.join(",")) {
                      setTimeout(() => onSet(rec), 300);
                    } else {
                      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
                      setMismatch(true);
                      feedbackTimer.current = setTimeout(() => {
                        setMismatch(false); setHeld([]); lastHeld.current = "";
                      }, 900);
                    }
                    return rec;
                  });
                }
                return s;
              });
            }, 800);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [onSet, onCancel]);

  const slots =
    stage === "record"
      ? Array.from({ length: 4 }, (_, i) => (held[i] !== undefined ? buttonLabel(held[i]) : null))
      : Array.from({ length: 4 }, (_, i) => (recorded[i] !== undefined ? buttonLabel(recorded[i]) : null));

  const isHolding4 = held.length === 4 && !mismatch;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-mono text-sm text-muted-foreground">
        {stage === "record" ? "Hold any 4 buttons simultaneously" : "Hold the same 4 buttons again to confirm"}
      </p>

      <div className="flex justify-center gap-3">
        {slots.map((label, i) => {
          const active =
            stage === "record" ? held[i] !== undefined : held[i] !== undefined && held.includes(recorded[i]);
          return (
            <div
              key={i}
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-display text-lg font-bold transition-all duration-150
                ${mismatch ? "border-destructive bg-destructive/10 text-destructive" : active ? "border-primary bg-primary/20 text-primary scale-105" : "border-border bg-background text-muted-foreground"}`}
            >
              {label ?? "·"}
            </div>
          );
        })}
      </div>

      {isHolding4 && (
        <p className="text-center font-mono text-sm text-primary animate-pulse">
          Hold to {stage === "record" ? "record" : "confirm"}…
        </p>
      )}
      {mismatch && <p className="text-center font-mono text-sm text-destructive">Doesn't match — try again</p>}

      {stage === "confirm" && (
        <button
          type="button"
          onClick={() => { setStage("record"); setRecorded([]); setHeld([]); lastHeld.current = ""; }}
          className="rounded-2xl border border-border px-4 py-2 font-display text-sm font-bold text-muted-foreground hover:border-primary/50 transition-colors"
        >
          ← Start Over
        </button>
      )}
    </div>
  );
}

// ── Keyboard set sub-component ─────────────────────────────────────────────

function KeyboardSetPanel({ onSet }: { onSet: (pin: string) => void }) {
  const [first, setFirst] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"first" | "confirm">("first");
  const [mismatch, setMismatch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [stage]);

  const submitFirst = () => {
    if (first.length < 4) return;
    setStage("confirm");
  };

  const submitConfirm = () => {
    if (confirm === first) {
      onSet(first);
    } else {
      setMismatch(true);
      setConfirm("");
      setTimeout(() => { setMismatch(false); inputRef.current?.focus(); }, 800);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-mono text-sm text-muted-foreground">
        {stage === "first" ? "Type a PIN (min 4 characters)" : "Re-enter your PIN to confirm"}
      </p>

      <input
        ref={inputRef}
        type="password"
        value={stage === "first" ? first : confirm}
        onChange={(e) => stage === "first" ? setFirst(e.target.value) : setConfirm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") stage === "first" ? submitFirst() : submitConfirm();
        }}
        placeholder="••••"
        className={`w-full rounded-2xl border-2 bg-background px-5 py-3 text-center font-display text-xl font-bold tracking-[0.4em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:outline-none transition-colors
          ${mismatch ? "border-destructive" : "border-border focus:border-primary"}`}
      />

      {mismatch && <p className="text-center font-mono text-sm text-destructive">Doesn't match — try again</p>}

      <div className="flex gap-3">
        {stage === "confirm" && (
          <button
            type="button"
            onClick={() => { setStage("first"); setConfirm(""); }}
            className="flex-1 rounded-2xl border border-border px-4 py-2 font-display text-sm font-bold text-muted-foreground hover:border-primary/50 transition-colors"
          >
            ← Back
          </button>
        )}
        <button
          type="button"
          onClick={stage === "first" ? submitFirst : submitConfirm}
          disabled={stage === "first" ? first.length < 4 : confirm.length === 0}
          className="flex-1 rounded-2xl border border-primary bg-primary/10 px-5 py-3 font-display text-sm font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {stage === "first" ? "Next →" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

// ── Main overlay ───────────────────────────────────────────────────────────

export function PasskeyOverlay(props: Props) {
  const { mode, profileName } = props;
  const [tab, setTab] = useState<InputTab>("gamepad");
  const [held, setHeld] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinWrong, setPinWrong] = useState(false);
  const lastHeld = useRef("");
  const lastB = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  const enterNeedsGamepad = mode === "enter" && !!props.passkey?.length;
  const enterNeedsPin = mode === "enter" && !!props.pin;

  useEffect(() => {
    if (mode === "enter") setTab(enterNeedsPin ? "keyboard" : "gamepad");
  }, [mode, enterNeedsPin]);

  useEffect(() => {
    if (mode === "enter" && tab === "keyboard") setTimeout(() => pinRef.current?.focus(), 50);
  }, [mode, tab]);

  // Gamepad polling for enter mode (+ B to cancel)
  useEffect(() => {
    if (mode !== "enter" || !enterNeedsGamepad) return;
    let raf = 0;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const bNow = !!pad.buttons[1]?.pressed;
        if (bNow && !lastB.current) props.onCancel();
        lastB.current = bNow;

        const pressed = getPressedButtons(pad);
        const key = sortedKey(pressed);
        if (key !== lastHeld.current) {
          lastHeld.current = key;
          setHeld(pressed);
          if (pressed.length === 4) {
            const attempt = sortedKey(pressed);
            const target = sortedKey(props.passkey!);
            if (attempt === target) {
              setTimeout(() => props.onSuccess(), 400);
            } else {
              if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
              setWrong(true);
              feedbackTimer.current = setTimeout(() => setWrong(false), 800);
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, [mode, enterNeedsGamepad, props]);

  // B to cancel for keyboard enter mode (no gamepad loop above)
  useEffect(() => {
    if (mode !== "enter" || enterNeedsGamepad) return;
    let raf = 0;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const bNow = !!pad.buttons[1]?.pressed;
        if (bNow && !lastB.current) props.onCancel();
        lastB.current = bNow;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, enterNeedsGamepad, props]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  const submitPin = () => {
    if (mode !== "enter") return;
    if (pinInput === props.pin) {
      props.onSuccess();
    } else {
      setPinWrong(true);
      setPinInput("");
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => { setPinWrong(false); pinRef.current?.focus(); }, 800);
    }
  };

  const borderColor = wrong || pinWrong ? "border-destructive" : "border-primary";
  const heading = mode === "set" ? "Set Passkey" : "Enter Passkey";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className={`w-full max-w-md rounded-3xl border-2 ${borderColor} bg-card p-10 shadow-2xl flex flex-col gap-6 transition-colors duration-200`}>

        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">{heading}</p>
          <h2 className="mt-2 font-display text-3xl font-black">{profileName}</h2>
        </div>

        {/* Tab switcher */}
        {(mode === "set" || (enterNeedsGamepad && enterNeedsPin)) && (
          <div className="flex rounded-2xl border border-border overflow-hidden">
            {(["gamepad", "keyboard"] as InputTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2 font-display text-sm font-bold transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                {t === "gamepad" ? "🎮 Gamepad" : "⌨️ Keyboard"}
              </button>
            ))}
          </div>
        )}

        {mode === "set" && tab === "gamepad" && (
          <GamepadSetPanel onSet={(passkey) => props.onSet({ type: "gamepad", passkey })} onCancel={props.onCancel} />
        )}
        {mode === "set" && tab === "keyboard" && (
          <KeyboardSetPanel onSet={(pin) => props.onSet({ type: "pin", pin })} />
        )}

        {mode === "enter" && tab === "gamepad" && (
          <div className="flex flex-col gap-4">
            <p className="text-center font-mono text-sm text-muted-foreground">Hold your 4-button passkey to unlock</p>
            <div className="flex justify-center gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-display text-lg font-bold transition-all duration-150
                    ${wrong ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-background text-muted-foreground"}`}
                >
                  ?
                </div>
              ))}
            </div>
            {wrong && <p className="text-center font-mono text-sm text-destructive">Wrong passkey</p>}
          </div>
        )}

        {mode === "enter" && tab === "keyboard" && (
          <div className="flex flex-col gap-4">
            <p className="text-center font-mono text-sm text-muted-foreground">Enter your PIN to unlock</p>
            <input
              ref={pinRef}
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitPin(); }}
              placeholder="••••"
              className={`w-full rounded-2xl border-2 bg-background px-5 py-3 text-center font-display text-xl font-bold tracking-[0.4em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:outline-none transition-colors
                ${pinWrong ? "border-destructive" : "border-border focus:border-primary"}`}
            />
            {pinWrong && <p className="text-center font-mono text-sm text-destructive">Wrong PIN</p>}
            <button
              type="button"
              onClick={submitPin}
              disabled={pinInput.length === 0}
              className="rounded-2xl border border-primary bg-primary/10 px-5 py-3 font-display text-sm font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Unlock
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={props.onCancel}
          className="rounded-2xl border border-border px-6 py-3 font-display text-sm font-bold text-foreground hover:border-primary/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
