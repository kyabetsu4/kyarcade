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

type SetStage = "record" | "confirm" | "done";

type Props =
  | { mode: "set"; profileName: string; onSet: (passkey: number[]) => void; onCancel: () => void }
  | { mode: "enter"; profileName: string; passkey: number[]; onSuccess: () => void; onCancel: () => void };

export function PasskeyOverlay(props: Props) {
  const { mode, profileName } = props;

  // "set" mode state
  const [stage, setStage] = useState<SetStage>("record");
  const [recorded, setRecorded] = useState<number[]>([]);

  // shared live held buttons
  const [held, setHeld] = useState<number[]>([]);

  // feedback
  const [wrong, setWrong] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHeld = useRef<string>("");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const pressed = getPressedButtons(pad);
        const key = sortedKey(pressed);

        if (key !== lastHeld.current) {
          lastHeld.current = key;
          setHeld(pressed);

          if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }

          if (mode === "set") {
            if (pressed.length === 4) {
              holdTimer.current = setTimeout(() => {
                setStage((s) => {
                  if (s === "record") {
                    const sorted = [...pressed].sort((a, b) => a - b);
                    setRecorded(sorted);
                    setHeld([]);
                    lastHeld.current = "";
                    return "confirm";
                  }
                  if (s === "confirm") {
                    setRecorded((rec) => {
                      const attempt = [...pressed].sort((a, b) => a - b);
                      if (attempt.join(",") === rec.join(",")) {
                        // small delay then fire onSet
                        setTimeout(() => props.onSet(rec), 400);
                        return rec;
                      } else {
                        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
                        setMismatch(true);
                        feedbackTimer.current = setTimeout(() => {
                          setMismatch(false);
                          setHeld([]);
                          lastHeld.current = "";
                        }, 900);
                        return rec;
                      }
                    });
                    return s;
                  }
                  return s;
                });
              }, 800);
            }
          }

          if (mode === "enter" && pressed.length === 4) {
            const attempt = sortedKey(pressed);
            const target = sortedKey(props.passkey);
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
    return () => {
      cancelAnimationFrame(raf);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [mode, props]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  // What to show in the 4 slots
  const slotSource: (string | null)[] =
    mode === "enter"
      ? Array(4).fill("?")
      : stage === "record"
        ? Array.from({ length: 4 }, (_, i) =>
            held[i] !== undefined ? buttonLabel(held[i]) : null,
          )
        : Array.from({ length: 4 }, (_, i) =>
            // confirm stage: show recorded keys, highlight matched held buttons
            recorded[i] !== undefined ? buttonLabel(recorded[i]) : null,
          );

  const isHoldingInConfirm =
    mode === "set" && stage === "confirm" && held.length === 4 && !mismatch;

  const borderColor =
    wrong || mismatch
      ? "border-destructive"
      : stage === "done"
        ? "border-green-500"
        : "border-primary";

  const subtitle =
    mode === "enter"
      ? "Hold your 4-button passkey to unlock"
      : stage === "record"
        ? "Hold any 4 buttons simultaneously"
        : stage === "confirm"
          ? "Now hold the same 4 buttons again to confirm"
          : "Passkey set!";

  const heading =
    mode === "set"
      ? stage === "record"
        ? "Set Passkey"
        : stage === "confirm"
          ? "Confirm Passkey"
          : "Passkey Set!"
      : "Enter Passkey";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div
        className={`w-full max-w-md rounded-3xl border-2 ${borderColor} bg-card p-10 shadow-2xl flex flex-col gap-8 transition-colors duration-200`}
      >
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">
            {heading}
          </p>
          <h2 className="mt-2 font-display text-3xl font-black">{profileName}</h2>
          <p className="mt-3 font-mono text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex justify-center gap-3">
          {slotSource.map((label, i) => {
            const isActiveSet =
              mode === "set" && stage === "record" && held[i] !== undefined;
            const isMatchedConfirm =
              mode === "set" &&
              stage === "confirm" &&
              held[i] !== undefined &&
              held.includes(recorded[i]);
            const active = isActiveSet || isMatchedConfirm;

            return (
              <div
                key={i}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 font-mono text-lg font-bold transition-all duration-150
                  ${
                    wrong || mismatch
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : active
                        ? "border-primary bg-primary/20 text-primary scale-105"
                        : "border-border bg-background text-muted-foreground"
                  }`}
              >
                {label ?? "·"}
              </div>
            );
          })}
        </div>

        {/* Status messages */}
        {mode === "set" && stage === "record" && held.length === 4 && (
          <p className="text-center font-mono text-sm text-primary animate-pulse">
            Hold to record…
          </p>
        )}
        {mode === "set" && stage === "confirm" && isHoldingInConfirm && (
          <p className="text-center font-mono text-sm text-primary animate-pulse">
            Hold to confirm…
          </p>
        )}
        {mismatch && (
          <p className="text-center font-mono text-sm text-destructive">
            Doesn't match — try again
          </p>
        )}
        {wrong && (
          <p className="text-center font-mono text-sm text-destructive">Wrong passkey</p>
        )}

        {mode === "set" && stage === "confirm" && (
          <button
            type="button"
            onClick={() => {
              setStage("record");
              setRecorded([]);
              setHeld([]);
              lastHeld.current = "";
            }}
            className="rounded-2xl border border-border px-6 py-2 font-mono text-xs text-muted-foreground hover:border-primary/50 transition-colors"
          >
            ← Start Over
          </button>
        )}

        <button
          type="button"
          onClick={props.onCancel}
          className="rounded-2xl border border-border px-6 py-3 font-mono text-sm text-foreground hover:border-primary/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
