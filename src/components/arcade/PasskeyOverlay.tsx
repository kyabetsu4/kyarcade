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

function getPressedSet(pad: Gamepad): Set<number> {
  return new Set(
    pad.buttons
      .map((b, i) => ({ pressed: b.value > 0.5, i }))
      .filter((x) => x.pressed)
      .map((x) => x.i),
  );
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
  const [sequence, setSequence] = useState<number[]>([]); // current input (record or confirm attempt)
  const [mismatch, setMismatch] = useState(false);
  const prevPressed = useRef<Set<number>>(new Set());
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track stage + recorded in refs for use inside RAF
  const stageRef = useRef<SetStage>("record");
  const recordedRef = useRef<number[]>([]);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { recordedRef.current = recorded; }, [recorded]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const cur = getPressedSet(pad);
        const prev = prevPressed.current;

        // Find newly pressed buttons this frame
        const newlyPressed: number[] = [];
        cur.forEach((idx) => { if (!prev.has(idx)) newlyPressed.push(idx); });

        for (const btn of newlyPressed) {
          if (btn === 1) {
            // B = backspace in record, cancel in confirm/empty
            if (stageRef.current === "record") {
              setSequence((seq) => {
                if (seq.length === 0) { onCancel(); return seq; }
                return seq.slice(0, -1);
              });
            } else {
              // in confirm stage, B resets confirm attempt
              setSequence([]);
            }
          } else if (stageRef.current === "record") {
            setSequence((seq) => {
              if (seq.length >= 4) return seq; // full, ignore until Next
              return [...seq, btn];
            });
          } else {
            // confirm stage: check each press against expected
            setSequence((seq) => {
              const next = [...seq, btn];
              const pos = seq.length;
              if (btn !== recordedRef.current[pos]) {
                // wrong button
                if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
                setMismatch(true);
                feedbackTimer.current = setTimeout(() => {
                  setMismatch(false);
                }, 900);
                return []; // reset attempt
              }
              if (next.length === 4) {
                // all 4 correct
                setTimeout(() => onSet(recordedRef.current), 300);
              }
              return next;
            });
          }
        }

        prevPressed.current = cur;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [onSet, onCancel]);

  const advanceToConfirm = () => {
    if (sequence.length < 4) return;
    setRecorded(sequence);
    recordedRef.current = sequence;
    setSequence([]);
    setStage("record"); // reset stage ref via useEffect
    // set stage to confirm after state flush
    setTimeout(() => setStage("confirm"), 0);
  };

  const slots = Array.from({ length: 4 }, (_, i) => sequence[i] !== undefined ? buttonLabel(sequence[i]) : null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-mono text-sm text-muted-foreground">
        {stage === "record"
          ? "Press 4 buttons in order  •  B to undo"
          : "Press the same 4 buttons again to confirm"}
      </p>

      <div className="flex justify-center gap-3">
        {slots.map((label, i) => {
          const filled = sequence[i] !== undefined;
          const isNext = i === sequence.length && stage === "confirm"; // next expected slot
          return (
            <div
              key={i}
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-display text-lg font-bold transition-all duration-150
                ${mismatch && stage === "confirm"
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : filled
                    ? "border-primary bg-primary/20 text-primary scale-105"
                    : isNext
                      ? "border-primary/50 bg-background text-muted-foreground animate-pulse"
                      : "border-border bg-background text-muted-foreground"
                }`}
            >
              {label ?? "·"}
            </div>
          );
        })}
      </div>

      {mismatch && (
        <p className="text-center font-mono text-sm text-destructive">Wrong button — try again</p>
      )}

      {stage === "record" && (
        <div className="flex gap-3">
          {sequence.length > 0 && (
            <button
              type="button"
              onClick={() => setSequence((s) => s.slice(0, -1))}
              className="rounded-2xl border border-border px-4 py-2 font-display text-sm font-bold text-muted-foreground hover:border-primary/50 transition-colors"
            >
              ← Undo
            </button>
          )}
          <button
            type="button"
            onClick={advanceToConfirm}
            disabled={sequence.length < 4}
            className="flex-1 rounded-2xl border border-primary bg-primary/10 px-5 py-3 font-display text-sm font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {stage === "confirm" && (
        <button
          type="button"
          onClick={() => { setStage("record"); setRecorded([]); setSequence([]); }}
          className="rounded-2xl border border-border px-4 py-2 font-display text-sm font-bold text-muted-foreground hover:border-primary/50 transition-colors"
        >
          ← Start Over
        </button>
      )}
    </div>
  );
}

// ── Gamepad enter sub-component ─────────────────────────────────────────────

function GamepadEnterPanel({
  passkey,
  onSuccess,
  onCancel,
}: {
  passkey: number[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const prevPressed = useRef<Set<number>>(new Set());
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const cur = getPressedSet(pad);
        const prev = prevPressed.current;

        const newlyPressed: number[] = [];
        cur.forEach((idx) => { if (!prev.has(idx)) newlyPressed.push(idx); });

        for (const btn of newlyPressed) {
          if (btn === 1) {
            // B = cancel
            onCancel();
            break;
          }
          setSequence((seq) => {
            const pos = seq.length;
            if (btn !== passkey[pos]) {
              if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
              setWrong(true);
              feedbackTimer.current = setTimeout(() => setWrong(false), 800);
              return []; // reset
            }
            const next = [...seq, btn];
            if (next.length === 4) {
              setTimeout(() => onSuccess(), 300);
            }
            return next;
          });
        }

        prevPressed.current = cur;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, [passkey, onSuccess, onCancel]);

  const slots = Array.from({ length: 4 }, (_, i) => (sequence[i] !== undefined ? "●" : null));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-mono text-sm text-muted-foreground">
        Press your 4-button passkey in order
      </p>
      <div className="flex justify-center gap-3">
        {slots.map((label, i) => {
          const filled = sequence[i] !== undefined;
          const isNext = i === sequence.length;
          return (
            <div
              key={i}
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-display text-2xl font-bold transition-all duration-150
                ${wrong
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : filled
                    ? "border-primary bg-primary/20 text-primary scale-105"
                    : isNext
                      ? "border-primary/40 bg-background text-muted-foreground animate-pulse"
                      : "border-border bg-background text-muted-foreground"
                }`}
            >
              {label ?? "·"}
            </div>
          );
        })}
      </div>
      {wrong && <p className="text-center font-mono text-sm text-destructive">Wrong passkey</p>}
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
  const [pinInput, setPinInput] = useState("");
  const [pinWrong, setPinWrong] = useState(false);
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

  // B to cancel for keyboard-only enter mode
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

  const borderColor = pinWrong ? "border-destructive" : "border-primary";
  const heading = mode === "set" ? "Set Passkey" : "Enter Passkey";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className={`w-full max-w-md rounded-3xl border-2 ${borderColor} bg-card p-10 shadow-2xl flex flex-col gap-6 transition-colors duration-200`}>

        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">{heading}</p>
          <h2 className="mt-2 font-display text-3xl font-black">{profileName}</h2>
        </div>

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
          <GamepadEnterPanel passkey={props.passkey!} onSuccess={props.onSuccess} onCancel={props.onCancel} />
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
