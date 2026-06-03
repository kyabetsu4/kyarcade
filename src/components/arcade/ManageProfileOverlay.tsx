import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { OnScreenKeyboard } from "./OnScreenKeyboard";
import { isElectron, getGamepad } from "@/lib/arcade-bridge";
import { AVATAR_GRADIENTS } from "@/lib/avatar-colors";
import type { Profile } from "@/lib/arcade-data";
import { DEFAULT_AVATARS } from "@/lib/avatars";

type Mode = "menu" | "rename" | "tagline" | "avatar" | "confirm-delete";

type Props = {
  profile: Profile;
  onClose: () => void;
  onRenamed: (id: string, newName: string) => void;
  onDeleted: (id: string) => void;
  onAvatarChanged: (id: string, avatar: string, avatarId: string) => void;
  onTaglineChanged: (id: string, tagline: string) => void;
  onModeChange?: (mode: Mode) => void;
};

export type ManageProfileOverlayHandle = {
  confirm: () => void;
  back: () => void;
  erase: () => void;
};

export const ManageProfileOverlay = forwardRef<ManageProfileOverlayHandle, Props>(
  function ManageProfileOverlay(
    {
      profile,
      onClose,
      onRenamed,
      onDeleted,
      onAvatarChanged,
      onTaglineChanged,
      onModeChange,
    }: Props,
    ref: React.Ref<ManageProfileOverlayHandle>,
  ) {
    const [mode, setMode] = useState<Mode>("menu");
    const setModeWithNotify = (m: Mode) => {
      setMode(m);
      onModeChange?.(m);
    };
    const [newName, setNewName] = useState(profile.name);
    const [newTagline, setNewTagline] = useState(profile.tagline ?? "");
    const [menuIndex, setMenuIndex] = useState(0);
    const [avatarIndex, setAvatarIndex] = useState(0);
    const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(0);
    const confirmDeleteIndexRef = useRef(confirmDeleteIndex);
    confirmDeleteIndexRef.current = confirmDeleteIndex;
    const [replaceOnType, setReplaceOnType] = useState(false);
    const replaceOnTypeRef = useRef(false);
    const MENU = ["Rename", "Set Tagline", "Change Avatar", "Delete", "Cancel"];
    const menuIndexRef = useRef(menuIndex);
    const modeRef = useRef(mode);
    const handleConfirmRef = useRef<() => void>(() => {});
    menuIndexRef.current = menuIndex;
    modeRef.current = mode;

    handleConfirmRef.current = () => handleConfirm();

    useImperativeHandle(ref, () => ({
      confirm: () => handleConfirmRef.current(),
      back: () => {
        const m = modeRef.current;
        if (m === "rename" || m === "tagline" || m === "avatar" || m === "confirm-delete")
          setModeWithNotify("menu");
        else onClose();
      },
      erase: () => {
        if (modeRef.current === "rename") setNewName((n) => n.slice(0, -1));
        else if (modeRef.current === "tagline") setNewTagline((n) => n.slice(0, -1));
      },
    }));

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const m = modeRef.current;
        if (m === "menu") {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setMenuIndex((i) => Math.min(MENU.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMenuIndex((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleConfirmRef.current();
          } else if (e.key === "Escape") onClose();
        } else if (m === "avatar") {
          const COLS = 4;
          const LEN = DEFAULT_AVATARS.length;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setAvatarIndex((i) => Math.min(LEN - 1, i + 1));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            setAvatarIndex((i) => Math.max(0, i - 1));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setAvatarIndex((i) => Math.min(LEN - 1, i + COLS));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAvatarIndex((i) => Math.max(0, i - COLS));
          } else if (e.key === "Enter") {
            e.preventDefault();
            handleConfirmRef.current();
          } else if (e.key === "Escape") setModeWithNotify("menu");
        } else if (m === "tagline") {
          if (e.key === "Escape") setModeWithNotify("menu");
        } else if (m === "confirm-delete") {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            setConfirmDeleteIndex((i) => 1 - i);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (confirmDeleteIndexRef.current === 1) confirmDelete();
            else setModeWithNotify("menu");
          } else if (e.key === "Escape") {
            e.preventDefault();
            setModeWithNotify("menu");
          }
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
      if (!("getGamepads" in navigator)) return;
      let raf = 0;
      const DEAD = 0.5;
      const initPad = getGamepad();
      let lastDirY = 0;
      let lastDirX = 0;
      let lastA = !!initPad?.buttons[0]?.pressed;
      let lastB = !!initPad?.buttons[1]?.pressed;

      const tick = () => {
        const pad = getGamepad();
        if (pad) {
          const m = modeRef.current;
          const bNow = !!pad.buttons[1]?.pressed;
          if (bNow && !lastB) {
            if (m === "rename" || m === "tagline" || m === "avatar" || m === "confirm-delete")
              setModeWithNotify("menu");
            else onClose();
          }
          lastB = bNow;

          if (m === "confirm-delete") {
            const x =
              (pad.axes[0] ?? 0) +
              (pad.buttons[15]?.pressed ? 1 : 0) -
              (pad.buttons[14]?.pressed ? 1 : 0);
            const dirNow = x > DEAD ? 1 : x < -DEAD ? -1 : 0;
            if (dirNow !== 0 && dirNow !== lastDirX) setConfirmDeleteIndex((i) => 1 - i);
            lastDirX = dirNow;
            const aNow = !!pad.buttons[0]?.pressed;
            if (aNow && !lastA) {
              if (confirmDeleteIndexRef.current === 1) confirmDelete();
              else setModeWithNotify("menu");
            }
            lastA = aNow;
          } else if (m === "menu") {
            const y =
              (pad.axes[1] ?? 0) +
              (pad.buttons[13]?.pressed ? 1 : 0) -
              (pad.buttons[12]?.pressed ? 1 : 0);
            const dirNow = y > DEAD ? 1 : y < -DEAD ? -1 : 0;
            if (dirNow !== 0 && dirNow !== lastDirY) {
              if (dirNow === 1) setMenuIndex((i) => Math.min(MENU.length - 1, i + 1));
              else setMenuIndex((i) => Math.max(0, i - 1));
            }
            lastDirY = dirNow;
            const aNow = !!pad.buttons[0]?.pressed;
            if (aNow && !lastA) handleConfirmRef.current();
            lastA = aNow;
          } else if (m === "avatar") {
            const COLS = 4;
            const LEN = DEFAULT_AVATARS.length;
            const x =
              (pad.axes[0] ?? 0) +
              (pad.buttons[15]?.pressed ? 1 : 0) -
              (pad.buttons[14]?.pressed ? 1 : 0);
            const y =
              (pad.axes[1] ?? 0) +
              (pad.buttons[13]?.pressed ? 1 : 0) -
              (pad.buttons[12]?.pressed ? 1 : 0);
            const dirX = x > DEAD ? 1 : x < -DEAD ? -1 : 0;
            const dirY = y > DEAD ? 1 : y < -DEAD ? -1 : 0;
            if (dirX !== 0 && dirX !== lastDirX)
              setAvatarIndex((i) => Math.max(0, Math.min(LEN - 1, i + dirX)));
            if (dirY !== 0 && dirY !== lastDirY)
              setAvatarIndex((i) => Math.max(0, Math.min(LEN - 1, i + dirY * COLS)));
            lastDirX = dirX;
            lastDirY = dirY;
            const aNow = !!pad.buttons[0]?.pressed;
            if (aNow && !lastA) handleConfirmRef.current();
            lastA = aNow;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, []);

    const handleConfirm = async () => {
      if (mode === "menu") {
        if (MENU[menuIndex] === "Rename") {
          setModeWithNotify("rename");
          setNewName(profile.name);
          setReplaceOnType(true);
          replaceOnTypeRef.current = true;
        } else if (MENU[menuIndex] === "Set Tagline") {
          setModeWithNotify("tagline");
          setNewTagline(profile.tagline ?? "");
          setReplaceOnType(true);
          replaceOnTypeRef.current = true;
        } else if (MENU[menuIndex] === "Change Avatar") {
          setModeWithNotify("avatar");
        } else if (MENU[menuIndex] === "Delete") {
          setConfirmDeleteIndex(0);
          setModeWithNotify("confirm-delete");
        } else {
          onClose();
        }
      } else if (mode === "avatar") {
        const picked = DEFAULT_AVATARS[avatarIndex];
        if (isElectron()) {
          await window.arcade!.saveProfile({
            id: profile.id,
            name: profile.name,
            avatar: picked.url,
            avatarId: picked.id,
            tagline: profile.tagline,
          });
        }
        onAvatarChanged(profile.id, picked.url, picked.id);
        onClose();
      }
    };

    const confirmDelete = async () => {
      if (isElectron()) await window.arcade!.deleteProfile(profile.id);
      onDeleted(profile.id);
    };

    const handleRename = async () => {
      if (!newName.trim()) return;
      if (isElectron()) await window.arcade!.renameProfile(profile.id, newName.trim());
      onRenamed(profile.id, newName.trim());
      onClose();
    };

    const handleTagline = async () => {
      const tagline = newTagline.trim();
      if (isElectron())
        await window.arcade!.saveProfile({
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          avatarId: profile.avatarId,
          tagline,
        });
      onTaglineChanged(profile.id, tagline);
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md">
        <div
          className={`w-full rounded-3xl border-2 border-primary bg-card px-12 py-10 shadow-2xl ${mode === "rename" || mode === "tagline" ? "max-w-4xl" : "max-w-2xl"}`}
        >
          {mode === "menu" && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Manage Profile
                </p>
                <h2 className="mt-2 font-display text-3xl font-black uppercase">{profile.name}</h2>
              </div>
              <div className="flex flex-col gap-3">
                {MENU.map((item, i) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMenuIndex(i);
                      setTimeout(handleConfirm, 0);
                    }}
                    onMouseEnter={() => setMenuIndex(i)}
                    className={`rounded-2xl border-2 px-6 py-4 font-display text-lg font-bold uppercase tracking-widest transition-all ${
                      menuIndex === i
                        ? item === "Delete"
                          ? "border-destructive bg-destructive text-destructive-foreground scale-[1.02]"
                          : "border-primary bg-primary text-primary-foreground scale-[1.02]"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "confirm-delete" && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Delete Profile
                </p>
                <h2 className="mt-2 font-display text-3xl font-black uppercase">{profile.name}</h2>
                <p className="mt-3 font-display text-base text-muted-foreground">
                  This cannot be undone.
                </p>
              </div>
              <div className="flex gap-4">
                {(["Cancel", "Delete"] as const).map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setConfirmDeleteIndex(i);
                      if (i === 1) confirmDelete();
                      else setModeWithNotify("menu");
                    }}
                    onMouseEnter={() => setConfirmDeleteIndex(i)}
                    className={`flex-1 rounded-2xl border-2 px-6 py-4 font-display text-lg font-bold uppercase tracking-widest transition-all ${
                      confirmDeleteIndex === i
                        ? i === 1
                          ? "border-destructive bg-destructive text-destructive-foreground scale-[1.02]"
                          : "border-primary bg-primary text-primary-foreground scale-[1.02]"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "rename" && (
            <div className="flex flex-col items-center gap-8 py-2">
              <div className="text-center">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Rename Profile
                </p>
                <div className="mt-3 min-h-14 flex items-center justify-center">
                  <h2
                    className={`font-display text-3xl font-black uppercase tracking-widest transition-colors ${replaceOnType ? "text-muted-foreground/40" : "text-foreground"}`}
                  >
                    {newName || <span className="text-muted-foreground/40">NAME</span>}
                  </h2>
                </div>
                <span className="font-mono text-sm text-muted-foreground">{newName.length}/16</span>
              </div>
              <OnScreenKeyboard
                onChar={(ch) => {
                  if (replaceOnTypeRef.current) {
                    replaceOnTypeRef.current = false;
                    setReplaceOnType(false);
                    setNewName(ch);
                  } else setNewName((n) => (n + ch).slice(0, 16));
                }}
                onBackspace={() => {
                  replaceOnTypeRef.current = false;
                  setReplaceOnType(false);
                  setNewName((n) => n.slice(0, -1));
                }}
                onConfirm={handleRename}
              />
            </div>
          )}
          {mode === "tagline" && (
            <div className="flex flex-col items-center gap-8 py-2">
              <div className="text-center">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Set Tagline
                </p>
                <div className="mt-3 min-h-14 flex items-center justify-center">
                  <h2
                    className={`font-display text-3xl font-black uppercase tracking-widest transition-colors ${replaceOnType ? "text-muted-foreground/40" : "text-foreground"}`}
                  >
                    {newTagline || <span className="text-muted-foreground/40">TAGLINE</span>}
                  </h2>
                </div>
                <span className="font-mono text-sm text-muted-foreground">
                  {newTagline.length}/24
                </span>
              </div>
              <OnScreenKeyboard
                onChar={(ch) => {
                  if (replaceOnTypeRef.current) {
                    replaceOnTypeRef.current = false;
                    setReplaceOnType(false);
                    setNewTagline(ch);
                  } else setNewTagline((n) => (n + ch).slice(0, 24));
                }}
                onBackspace={() => {
                  replaceOnTypeRef.current = false;
                  setReplaceOnType(false);
                  setNewTagline((n) => n.slice(0, -1));
                }}
                onConfirm={handleTagline}
              />
            </div>
          )}
          {mode === "avatar" && (
            <div className="flex flex-col items-center gap-6">
              <h2 className="font-display text-3xl font-black uppercase">Choose Avatar</h2>
              <div className="grid grid-cols-4 gap-4">
                {DEFAULT_AVATARS.map((a, i) => {
                  const [from, to] = AVATAR_GRADIENTS[a.id] ?? ["#2d2d3a", "#1a1a2e"];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAvatarIndex(i);
                        setTimeout(() => handleConfirmRef.current(), 0);
                      }}
                      onMouseEnter={() => setAvatarIndex(i)}
                      className={`relative size-24 overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
                        avatarIndex === i
                          ? "border-primary scale-110 shadow-lg"
                          : "border-border opacity-50 hover:opacity-100"
                      }`}
                      style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
                    >
                      <img src={a.url} alt={a.id} className="h-full w-full object-contain p-2" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);
