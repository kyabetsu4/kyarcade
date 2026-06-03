import { useCallback, useEffect, useRef, useState } from "react";
import { getGamepad } from "./arcade-bridge";

type Direction = "up" | "down" | "left" | "right";

type Options = {
  count: number;
  onConfirm?: (index: number) => void;
  onBack?: () => void;
  onMove?: (dir: Direction, current: number) => number;
  disabled?: boolean;
};

export function useArcadeNav({ count, onConfirm, onBack, onMove, disabled }: Options) {
  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);
  focusRef.current = focus;

  const onConfirmRef = useRef(onConfirm);
  const onBackRef = useRef(onBack);
  const onMoveRef = useRef(onMove);
  const countRef = useRef(count);
  const disabledRef = useRef(disabled);
  onConfirmRef.current = onConfirm;
  onBackRef.current = onBack;
  onMoveRef.current = onMove;
  countRef.current = count;
  disabledRef.current = disabled;

  const move = useCallback((dir: Direction) => {
    setFocus((cur) => {
      const next = onMoveRef.current
        ? onMoveRef.current(dir, cur)
        : dir === "right"
          ? Math.min(countRef.current - 1, cur + 1)
          : dir === "left"
            ? Math.max(0, cur - 1)
            : cur;
      return Math.max(0, Math.min(countRef.current - 1, next));
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabledRef.current) return;
      switch (e.key) {
        case "ArrowRight": e.preventDefault(); move("right"); break;
        case "ArrowLeft": e.preventDefault(); move("left"); break;
        case "ArrowDown": e.preventDefault(); move("down"); break;
        case "ArrowUp": e.preventDefault(); move("up"); break;
        case "Enter":
        case " ":
          e.preventDefault();
          onConfirmRef.current?.(focusRef.current);
          break;
        case "Escape":
        case "Backspace":
          e.preventDefault();
          onBackRef.current?.();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("getGamepads" in navigator)) return;
    let raf = 0;
    const DEAD = 0.5;
    const initPad = getGamepad();
    const initX = initPad ? (initPad.axes[0] ?? 0) + (initPad.buttons[15]?.pressed ? 1 : 0) - (initPad.buttons[14]?.pressed ? 1 : 0) : 0;
    const initY = initPad ? (initPad.axes[1] ?? 0) + (initPad.buttons[13]?.pressed ? 1 : 0) - (initPad.buttons[12]?.pressed ? 1 : 0) : 0;
    let lastDir = Math.abs(initX) > Math.abs(initY)
      ? initX > DEAD ? 1 : initX < -DEAD ? -1 : 0
      : initY > DEAD ? 2 : initY < -DEAD ? -2 : 0;
    let lastBtnA = !!initPad?.buttons[0]?.pressed;
    let lastBtnB = !!initPad?.buttons[1]?.pressed;

    const tick = () => {
      const pad = getGamepad();
      if (disabledRef.current) {
        if (pad) {
          lastBtnA = !!pad.buttons[0]?.pressed;
          lastBtnB = !!pad.buttons[1]?.pressed;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
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
        const bNow = !!pad.buttons[1]?.pressed;
        if (aNow && !lastBtnA) onConfirmRef.current?.(focusRef.current);
        if (bNow && !lastBtnB) onBackRef.current?.();
        lastBtnA = aNow;
        lastBtnB = bNow;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [move]);

  return { focus, setFocus };
}
