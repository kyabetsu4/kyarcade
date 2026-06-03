import { useEffect, useState } from "react";

export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = now
    .toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" })
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 font-display text-5xl font-black tracking-tight tabular-nums">
      <span className="text-foreground">{time}</span>
      <span className="text-muted-foreground">{date}</span>
    </div>
  );
}
