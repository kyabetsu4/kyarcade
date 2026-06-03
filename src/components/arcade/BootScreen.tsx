import { useEffect, useState } from "react";

export function BootScreen({ onDone, message }: { onDone: () => void; message?: string }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const hold = setTimeout(() => setPhase("hold"), 400);
    const out  = setTimeout(() => setPhase("out"),  1000);
    const done = setTimeout(onDone,                 1500);
    return () => { clearTimeout(hold); clearTimeout(out); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background transition-opacity duration-700 ${
        phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <span className={`text-[8rem] leading-none boot-emoji ${phase === "in" ? "" : "boot-emoji-settled"}`}>
        🥬
      </span>
      <h1 className={`font-display text-6xl font-black uppercase tracking-[0.2em] text-foreground boot-title ${phase === "in" ? "" : "boot-title-settled"}`}>
        kyarcade
      </h1>
      {message && (
        <p className={`font-mono text-xs uppercase tracking-[0.4em] text-muted-foreground boot-sub ${phase === "in" ? "" : "boot-sub-settled"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
