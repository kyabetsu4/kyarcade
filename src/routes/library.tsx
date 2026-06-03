import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { ButtonHint } from "@/components/arcade/ButtonHint";
import { type Profile } from "@/lib/arcade-data";
import { isElectron, getGamepad } from "@/lib/arcade-bridge";
import { getAvatarGradient } from "@/lib/avatar-colors";
import { useSettings } from "@/lib/use-settings";
import { avatarUrl } from "@/lib/avatars";

const DEMO_PROFILES: Record<string, Profile> = {
  player1: {
    id: "player1",
    name: "Dominic",
    tagline: "Arcade Champion",
    level: 1,
    avatarId: "mushroom",
    avatar: avatarUrl("1F344"),
    recent: [],
    favorites: [],
  },
  player2: {
    id: "player2",
    name: "Alex",
    tagline: "High Score Hunter",
    level: 1,
    avatarId: "tomato",
    avatar: avatarUrl("1F345"),
    recent: [],
    favorites: [],
  },
  player3: {
    id: "player3",
    name: "Sam",
    tagline: "Insert Coin",
    level: 1,
    avatarId: "corn",
    avatar: avatarUrl("1F33D"),
    recent: [],
    favorites: [],
  },
};

const searchSchema = z.object({ profile: z.string().optional() });

export const Route = createFileRoute("/library")({
  validateSearch: searchSchema,
  component: Launching,
});

const STEPS = [
  "Loading profile",
  "Applying controller map",
  "Mounting ROM collections",
  "Restoring save states",
  "Starting EmulationStation",
];

function StepRow({
  label,
  status,
  index,
}: {
  label: string;
  status: "pending" | "active" | "done";
  index: number;
}) {
  return (
    <div
      className="flex items-center gap-5 transition-all duration-500"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
          status === "done"
            ? "border-accent bg-accent text-accent-foreground"
            : status === "active"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-transparent text-muted-foreground/30"
        }`}
      >
        {status === "done" ? (
          <span className="text-xs font-black">✓</span>
        ) : status === "active" ? (
          <span className="text-xs animate-pulse font-black">›</span>
        ) : (
          <span className="text-xs">·</span>
        )}
        {status === "active" && (
          <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
        )}
      </div>

      <span
        className={`font-mono text-sm tracking-[0.2em] transition-all duration-500 ${
          status === "done"
            ? "text-accent"
            : status === "active"
              ? "text-foreground"
              : "text-muted-foreground/30"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function Launching() {
  const navigate = useNavigate();
  const { profile: profileId } = Route.useSearch();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!profileId) return;
    if (isElectron()) {
      window.arcade!.getProfiles().then((raw) => {
        const found = raw.find((p) => p.id === profileId);
        if (found)
          setProfile({
            ...found,
            tagline: found.tagline || "",
            level: 1,
            recent: [],
            favorites: [],
          });
      });
    } else {
      setProfile(DEMO_PROFILES[profileId] ?? null);
    }
  }, [profileId]);

  const done = step >= STEPS.length;
  const pct = Math.min(100, Math.round((step / STEPS.length) * 100));

  useEffect(() => {
    if (step >= STEPS.length) {
      if (isElectron() && profileId) window.arcade!.launchProfile(profileId);
      return;
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), 700);
    return () => window.clearTimeout(t);
  }, [step, profileId]);

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") navigate({ to: "/" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, done]);

  useEffect(() => {
    if (!("getGamepads" in navigator)) return;
    let raf = 0;
    let lastB = false;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const bNow = !!pad.buttons[1]?.pressed;
        if (bNow && !lastB) navigate({ to: "/" });
        lastB = bNow;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [navigate]);

  const { settings } = useSettings();
  const [from, to] = getAvatarGradient(profile?.avatarId);

  return (
    <ArcadeShell
      showCredits={settings.showCredits}
      title={done ? "Ready" : "Loading..."}
      footer={
        <div className="flex w-full items-center justify-center gap-12">
          {done ? (
            <ButtonHint
              action="back"
              label="Change Profile"
              onClick={() => navigate({ to: "/" })}
            />
          ) : (
            <ButtonHint action="back" label="Cancel" onClick={() => navigate({ to: "/" })} />
          )}
        </div>
      }
    >
      <div className="flex w-full max-w-5xl items-center gap-20">
        <div
          className="arcade-slide-up shrink-0 overflow-hidden rounded-3xl border-2 border-primary shadow-2xl"
          style={{
            height: "52vh",
            aspectRatio: "3/5",
            background: `linear-gradient(160deg, ${from}, ${to})`,
            boxShadow: `0 0 80px -20px ${from}88`,
          }}
        >
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-full w-full object-contain p-8 drop-shadow-2xl"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-display text-7xl font-black text-white/80">
                {profile?.name?.slice(0, 2).toUpperCase() ?? "…"}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-10">
          <div className="arcade-slide-up flex flex-col gap-2" style={{ animationDelay: "80ms" }}>
            <h2 className="font-display text-8xl font-black uppercase leading-none tracking-tight text-foreground">
              {profile?.name ?? "…"}
            </h2>
            {profile?.tagline && (
              <p className="font-mono text-base tracking-[0.3em] text-muted-foreground">
                {profile.tagline}
              </p>
            )}
          </div>

          <div className="arcade-slide-up flex flex-col gap-3" style={{ animationDelay: "160ms" }}>
            <div className="h-4 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${from}, ${to})`,
                  boxShadow: pct > 0 ? `0 0 24px 4px ${from}88` : "none",
                }}
              />
            </div>
            <div className="flex justify-end">
              <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground">
                {pct}%
              </span>
            </div>
          </div>

          <div className="arcade-slide-up flex flex-col gap-4" style={{ animationDelay: "240ms" }}>
            {STEPS.map((s, i) => (
              <StepRow
                key={s}
                label={s}
                index={i}
                status={i < step ? "done" : i === step ? "active" : "pending"}
              />
            ))}
          </div>
        </div>
      </div>
    </ArcadeShell>
  );
}
