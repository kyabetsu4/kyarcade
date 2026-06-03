import { useControllerType } from "@/lib/use-controller-type";

export function NintendoNotice() {
  const { type } = useControllerType();
  if (type !== "nintendo") return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-3">
      <span className="text-xl">⚠</span>
      <p className="font-mono text-sm uppercase tracking-[0.15em] text-yellow-400">
        Nintendo controller detected — A·B are swapped
      </p>
    </div>
  );
}
