import type { ReactNode } from "react";
import { Clock } from "./Clock";

export function ArcadeShell({
  eyebrow,
  title,
  status,
  children,
  footer,
  showCredits = true,
  onAdvanced,
}: {
  eyebrow?: string;
  title?: string;
  status?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  showCredits?: boolean;
  onAdvanced?: () => void;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="relative z-10 flex items-center justify-between px-8 py-8">
        <div className="flex items-center gap-6">
          {eyebrow ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="font-display text-5xl font-black tracking-tight text-foreground">
            {title}
          </h1>
          {status ? (
            <span className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {status}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          {onAdvanced && (
            <button
              type="button"
              tabIndex={-1}
              onClick={onAdvanced}
              aria-label="Advanced options"
              className="font-display text-5xl font-black leading-none text-muted-foreground/40 hover:text-muted-foreground transition-colors select-none"
            >
              ⚙
            </button>
          )}
          <Clock />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-8 py-8">
        {children}
      </main>

      <footer className="relative z-10 flex items-center justify-between px-8 py-4">
        {footer}
      </footer>
      {showCredits && (
        <div className="relative z-10 flex items-center justify-center py-2">
          <p className="font-display text-sm font-bold tracking-[0.2em] text-muted-foreground">
            🥬 kyarcade
          </p>
        </div>
      )}
    </div>
  );
}
