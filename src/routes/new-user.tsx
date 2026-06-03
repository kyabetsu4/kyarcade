import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { ButtonHint } from "@/components/arcade/ButtonHint";
import { OnScreenKeyboard } from "@/components/arcade/OnScreenKeyboard";
import { isElectron, getGamepad } from "@/lib/arcade-bridge";
import { AVATAR_GRADIENTS } from "@/lib/avatar-colors";
import { DEFAULT_AVATARS } from "@/lib/avatars";

type Step = "avatar" | "name";

export const Route = createFileRoute("/new-user")({
  component: NewUser,
});

function NewUser() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("avatar");
  const [name, setName] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [avatarPath, setAvatarPath] = useState<string>(DEFAULT_AVATARS[0].url);
  const [avatarId, setAvatarId] = useState<string>(DEFAULT_AVATARS[0].id);
  const stepRef = useRef(step);
  const avatarIndexRef = useRef(avatarIndex);
  stepRef.current = step;
  avatarIndexRef.current = avatarIndex;

  const profileId = name.trim().toLowerCase().replace(/\s+/g, "-") || "new-player";
  const canConfirm = name.trim().length > 0;

  const selectAvatar = (i: number) => {
    setAvatarIndex(i);
    setAvatarPath(DEFAULT_AVATARS[i].url);
    setAvatarId(DEFAULT_AVATARS[i].id);
  };

  const confirm = useCallback(async () => {
    if (name.trim().length === 0) return;
    if (isElectron()) {
      await window.arcade!.saveProfile({
        id: profileId,
        name: name.trim(),
        avatar: avatarPath,
        avatarId,
      });
    }
    navigate({ to: "/" });
  }, [name, avatarPath, avatarId, profileId, navigate]);

  const pickAvatar = async () => {
    if (!isElectron()) return;
    const filePath = await window.arcade!.pickAvatar(profileId);
    if (filePath) {
      setAvatarPath(`arcade://${filePath}`);
      setAvatarId("");
      setAvatarIndex(-1);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stepRef.current === "avatar") {
        const UPLOAD = DEFAULT_AVATARS.length;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setAvatarIndex((i) => (i === UPLOAD ? UPLOAD : Math.min(UPLOAD - 1, i + 1)));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setAvatarIndex((i) => (i === UPLOAD ? UPLOAD : Math.max(0, i - 1)));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setAvatarIndex((i) => {
            if (i === UPLOAD) return UPLOAD;
            if (i >= UPLOAD - 4) return UPLOAD;
            return i + 4;
          });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setAvatarIndex((i) => (i === UPLOAD ? UPLOAD - 4 : Math.max(0, i - 4)));
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (avatarIndexRef.current === UPLOAD) {
            pickAvatar().then(() => setStep("name"));
            return;
          }
          const a = DEFAULT_AVATARS[avatarIndexRef.current];
          if (a) {
            setAvatarPath(a.url);
            setAvatarId(a.id);
          }
          setStep("name");
        } else if (e.key === "Escape") navigate({ to: "/" });
      } else {
        if (e.key === "Escape") setStep("avatar");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    if (!("getGamepads" in navigator)) return;
    let raf = 0;
    const DEAD = 0.5;
    const initPad = getGamepad();
    let lastDirX = 0;
    let lastDirY = 0;
    let lastA = !!initPad?.buttons[0]?.pressed;
    let lastB = !!initPad?.buttons[1]?.pressed;

    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const s = stepRef.current;
        const bNow = !!pad.buttons[1]?.pressed;
        if (bNow && !lastB) {
          if (s === "name") setStep("avatar");
          else navigate({ to: "/" });
        }
        lastB = bNow;

        if (s === "avatar") {
          const x =
            (pad.axes[0] ?? 0) +
            (pad.buttons[15]?.pressed ? 1 : 0) -
            (pad.buttons[14]?.pressed ? 1 : 0);
          const y =
            (pad.axes[1] ?? 0) +
            (pad.buttons[13]?.pressed ? 1 : 0) -
            (pad.buttons[12]?.pressed ? 1 : 0);
          const dx = x > DEAD ? 1 : x < -DEAD ? -1 : 0;
          const dy = y > DEAD ? 1 : y < -DEAD ? -1 : 0;
          const UPLOAD = DEFAULT_AVATARS.length;
          if (dx !== 0 && dx !== lastDirX) {
            setAvatarIndex((i) =>
              i === UPLOAD ? UPLOAD : dx === 1 ? Math.min(UPLOAD - 1, i + 1) : Math.max(0, i - 1),
            );
          }
          lastDirX = dx;
          if (dy !== 0 && dy !== lastDirY) {
            setAvatarIndex((i) => {
              if (dy === 1) {
                if (i === UPLOAD) return UPLOAD;
                if (i >= UPLOAD - 4) return UPLOAD;
                return i + 4;
              }
              return i === UPLOAD ? UPLOAD - 4 : Math.max(0, i - 4);
            });
          }
          lastDirY = dy;

          const aNow = !!pad.buttons[0]?.pressed;
          if (aNow && !lastA) {
            if (avatarIndexRef.current === UPLOAD) {
              pickAvatar().then(() => setStep("name"));
            } else {
              const a = DEFAULT_AVATARS[avatarIndexRef.current];
              if (a) {
                setAvatarPath(a.url);
                setAvatarId(a.id);
              }
              setStep("name");
            }
          }
          lastA = aNow;
        } else {
          lastDirX = 0;
          lastDirY = 0;
          const aNow = !!pad.buttons[0]?.pressed;
          lastA = aNow;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [navigate]);

  const selectedAvatar = DEFAULT_AVATARS[avatarIndex];
  const [from, to] = AVATAR_GRADIENTS[selectedAvatar?.id ?? ""] ?? ["#2d2d3a", "#1a1a2e"];

  return (
    <ArcadeShell
      title="New Player"
      footer={
        <div className="flex w-full items-center justify-center gap-12">
          {step === "avatar" ? (
            <>
              <ButtonHint
                action="confirm"
                label="Choose Avatar"
                tone="primary"
                onClick={() => {
                  const a = DEFAULT_AVATARS[avatarIndexRef.current];
                  if (a) {
                    setAvatarPath(a.url);
                    setAvatarId(a.id);
                  }
                  setStep("name");
                }}
              />
              <ButtonHint action="back" label="Back" onClick={() => navigate({ to: "/" })} />
            </>
          ) : (
            <>
              <ButtonHint
                action="confirm"
                label="Confirm"
                tone={canConfirm ? "primary" : undefined}
                onClick={confirm}
              />
              <ButtonHint
                action="erase"
                label="Erase"
                onClick={() => setName((n) => n.slice(0, -1))}
              />
              <ButtonHint action="back" label="Back" onClick={() => setStep("avatar")} />
            </>
          )}
        </div>
      }
    >
      {step === "avatar" && (
        <div className="mx-auto flex items-center gap-24">
          <div className="flex flex-col items-center gap-4 shrink-0">
            <div
              className="size-52 overflow-hidden rounded-3xl border-4 border-primary shadow-2xl transition-all duration-300"
              style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
            >
              {selectedAvatar && (
                <img
                  src={selectedAvatar.url}
                  alt={selectedAvatar.label}
                  className="h-full w-full object-contain p-4"
                />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Step 1 of 2
              </p>
              <h2 className="font-display text-xl font-black uppercase">Choose Avatar</h2>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-4">
              {DEFAULT_AVATARS.map((a, i) => {
                const [gFrom, gTo] = AVATAR_GRADIENTS[a.id] ?? ["#2d2d3a", "#1a1a2e"];
                return (
                  <button
                    key={a.id}
                    type="button"
                    title={a.label}
                    onClick={() => {
                      selectAvatar(i);
                      setStep("name");
                    }}
                    onMouseEnter={() => setAvatarIndex(i)}
                    className={`size-28 overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
                      avatarIndex === i
                        ? "border-primary scale-110 shadow-lg"
                        : "border-border opacity-50 hover:opacity-100"
                    }`}
                    style={{ background: `linear-gradient(160deg, ${gFrom}, ${gTo})` }}
                  >
                    <img src={a.url} alt={a.label} className="h-full w-full object-contain p-2" />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={async () => {
                await pickAvatar();
                setStep("name");
              }}
              onMouseEnter={() => setAvatarIndex(DEFAULT_AVATARS.length)}
              className={`rounded-2xl border-2 px-8 py-4 font-display text-base font-bold transition-all ${
                avatarIndex === DEFAULT_AVATARS.length
                  ? "border-primary bg-primary text-primary-foreground scale-[1.02]"
                  : "border-border bg-background hover:border-primary hover:text-primary"
              }`}
            >
              + Upload Custom Image
            </button>
          </div>
        </div>
      )}

      {step === "name" && (
        <div className="mx-auto flex w-full max-w-6xl flex-row items-center gap-14">
          <div className="flex flex-col items-center gap-5 pt-2">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Step 2 of 2
            </p>
            <div
              className="size-56 overflow-hidden rounded-3xl border-4 border-primary shadow-xl"
              style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
            >
              <img src={avatarPath} alt="avatar" className="h-full w-full object-contain p-4" />
            </div>
            <button
              type="button"
              onClick={() => setStep("avatar")}
              className="font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors"
            >
              ← Change Avatar
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center gap-6">
            <div className="flex w-full flex-col items-center gap-2">
              <div className="flex items-end justify-center min-h-16">
                <span className="font-display text-6xl font-black uppercase tracking-widest text-foreground">
                  {name || <span className="text-muted-foreground/30">PLAYER</span>}
                </span>
              </div>
              <span className="font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground">
                {name.length}/16
              </span>
            </div>

            <OnScreenKeyboard
              onChar={(ch) => setName((n) => (n + ch).slice(0, 16))}
              onBackspace={() => setName((n) => n.slice(0, -1))}
              onConfirm={confirm}
            />
          </div>
        </div>
      )}
    </ArcadeShell>
  );
}
