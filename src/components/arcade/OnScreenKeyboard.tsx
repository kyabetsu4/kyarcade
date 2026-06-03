import { useCallback, useEffect, useRef, useState } from "react";
import { getGamepad } from "@/lib/arcade-bridge";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "⌫", "OK"],
  ["SPACE"],
];

const FLAT = ROWS.flat();

function rowOf(idx: number) {
  let count = 0;
  for (let r = 0; r < ROWS.length; r++) {
    if (idx < count + ROWS[r].length) return r;
    count += ROWS[r].length;
  }
  return ROWS.length - 1;
}

function colOf(idx: number) {
  let count = 0;
  for (const row of ROWS) {
    if (idx < count + row.length) return idx - count;
    count += row.length;
  }
  return 0;
}

function rowStart(row: number) {
  let count = 0;
  for (let r = 0; r < row; r++) count += ROWS[r].length;
  return count;
}

type Props = {
  onChar: (ch: string) => void;
  onBackspace: () => void;
  onConfirm: () => void;
};

export function OnScreenKeyboard({ onChar, onBackspace, onConfirm }: Props) {
  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);
  focusRef.current = focus;

  const onCharRef = useRef(onChar);
  const onBackspaceRef = useRef(onBackspace);
  const onConfirmRef = useRef(onConfirm);
  onCharRef.current = onChar;
  onBackspaceRef.current = onBackspace;
  onConfirmRef.current = onConfirm;

  const press = useCallback((key: string) => {
    if (key === "⌫") onBackspaceRef.current();
    else if (key === "OK") onConfirmRef.current();
    else if (key === "SPACE") onCharRef.current(" ");
    else onCharRef.current(key);
  }, []);

  const move = useCallback((dir: "up" | "down" | "left" | "right") => {
    setFocus((cur) => {
      const r = rowOf(cur);
      const c = colOf(cur);
      if (dir === "left") return Math.max(rowStart(r), cur - 1);
      if (dir === "right") return Math.min(rowStart(r) + ROWS[r].length - 1, cur + 1);
      if (dir === "up") {
        if (r === 0) return cur;
        const prevRow = r - 1;
        const clampedCol = Math.min(c, ROWS[prevRow].length - 1);
        return rowStart(prevRow) + clampedCol;
      }
      if (dir === "down") {
        if (r === ROWS.length - 1) return cur;
        const nextRow = r + 1;
        const clampedCol = Math.min(c, ROWS[nextRow].length - 1);
        return rowStart(nextRow) + clampedCol;
      }
      return cur;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); move("left"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); move("right"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move("up"); }
      else if (e.key === "ArrowDown") { e.preventDefault(); move("down"); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(FLAT[focusRef.current]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move, press]);

  useEffect(() => {
    if (!("getGamepads" in navigator)) return;
    let raf = 0;
    const DEAD = 0.5;
    const initPad = getGamepad();
    const initX = initPad ? (initPad.axes[0] ?? 0) + (initPad.buttons[15]?.pressed ? 1 : 0) - (initPad.buttons[14]?.pressed ? 1 : 0) : 0;
    const initY = initPad ? (initPad.axes[1] ?? 0) + (initPad.buttons[13]?.pressed ? 1 : 0) - (initPad.buttons[12]?.pressed ? 1 : 0) : 0;
    let lastDir = Math.abs(initX) > Math.abs(initY)
      ? initX > DEAD ? 1 : initX < -DEAD ? -1 : 0
      : initY > DEAD ? 2 : initY < -DEAD ? -2 : 0;
    let lastA = !!initPad?.buttons[0]?.pressed;
    let lastX = !!initPad?.buttons[2]?.pressed;

    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const x = (pad.axes[0] ?? 0) + (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
        const y = (pad.axes[1] ?? 0) + (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
        const dirNow = Math.abs(x) > Math.abs(y)
          ? x > DEAD ? 1 : x < -DEAD ? -1 : 0
          : y > DEAD ? 2 : y < -DEAD ? -2 : 0;
        if (dirNow !== 0 && dirNow !== lastDir) {
          if (dirNow === 1) move("right");
          else if (dirNow === -1) move("left");
          else if (dirNow === 2) move("down");
          else if (dirNow === -2) move("up");
        }
        lastDir = dirNow;
        const aNow = !!pad.buttons[0]?.pressed;
        const xNow = !!pad.buttons[2]?.pressed;
        if (aNow && !lastA) press(FLAT[focusRef.current]);
        if (xNow && !lastX) onBackspaceRef.current();
        lastA = aNow;
        lastX = xNow;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [move, press]);

  let flatIdx = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {ROWS.map((row, r) => (
        <div key={r} className="flex gap-4">
          {row.map((key) => {
            const idx = flatIdx++;
            const active = focus === idx;
            const isWide = key === "SPACE" || key === "OK" || key === "⌫";
            return (
              <button
                key={key}
                type="button"
                onMouseEnter={() => setFocus(idx)}
                onClick={() => press(key)}
                className={`
                  flex items-center justify-center rounded-xl border-2 font-mono text-base font-bold uppercase transition-all duration-100 select-none
                  ${isWide ? (key === "SPACE" ? "w-64 h-14" : "w-20 h-14") : "w-14 h-14"}
                  ${active
                    ? "border-primary bg-primary text-primary-foreground scale-110 shadow-[0_0_16px_-4px_hsl(var(--primary))]"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                  }
                `}
              >
                {key === "SPACE" ? "SPACE" : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
