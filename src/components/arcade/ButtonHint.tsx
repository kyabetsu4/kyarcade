import type { ButtonAction } from "@/lib/use-controller-type";
import { useControllerType } from "@/lib/use-controller-type";

export function ButtonHint({
  action,
  glyph: glyphOverride,
  label,
  tone = "default",
  onClick,
}: {
  action?: ButtonAction;
  glyph?: string;
  label: string;
  tone?: "default" | "primary" | "accent";
  onClick?: () => void;
}) {
  const { glyph } = useControllerType();
  const display = glyphOverride ?? (action ? glyph(action) : "?");

  const ring =
    tone === "primary"
      ? "border-primary text-primary"
      : tone === "accent"
        ? "border-accent text-accent"
        : "border-foreground/60 text-foreground";

  const inner = (
    <>
      <span className={`grid size-14 place-items-center rounded-full border-2 font-display text-2xl font-bold ${ring}`}>
        {display}
      </span>
      <span className="font-mono text-base uppercase tracking-[0.2em] text-foreground/80">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex items-center gap-4 cursor-pointer hover:opacity-70 transition-opacity">
        {inner}
      </button>
    );
  }

  return <div className="flex items-center gap-4">{inner}</div>;
}
