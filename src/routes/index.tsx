import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { ButtonHint } from "@/components/arcade/ButtonHint";
import { NewUserCard, ProfileCard } from "@/components/arcade/ProfileCard";
import {
  ManageProfileOverlay,
  type ManageProfileOverlayHandle,
} from "@/components/arcade/ManageProfileOverlay";
import { SettingsOverlay, type SettingsOverlayHandle } from "@/components/arcade/SettingsOverlay";
import { NintendoNotice } from "@/components/arcade/NintendoNotice";
import { type Profile } from "@/lib/arcade-data";
import { useArcadeNav } from "@/lib/use-arcade-nav";
import { isElectron, getGamepad } from "@/lib/arcade-bridge";
import { useTheme } from "@/lib/use-theme";
import { useSettings } from "@/lib/use-settings";
import { avatarUrl } from "@/lib/avatars";

const DEMO_PROFILES: Profile[] = [
  {
    id: "player1",
    name: "Dominic",
    tagline: "Arcade Champion",
    level: 1,
    avatarId: "mushroom",
    avatar: avatarUrl("1F344"),
    recent: [],
    favorites: [],
  },
  {
    id: "player2",
    name: "Alex",
    tagline: "High Score Hunter",
    level: 1,
    avatarId: "tomato",
    avatar: avatarUrl("1F345"),
    recent: [],
    favorites: [],
  },
  {
    id: "player3",
    name: "Sam",
    tagline: "Insert Coin",
    level: 1,
    avatarId: "corn",
    avatar: avatarUrl("1F33D"),
    recent: [],
    favorites: [],
  },
];

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [managing, setManaging] = useState<Profile | null>(null);
  const [managingMode, setManagingMode] = useState<string>("menu");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsEditing, setSettingsEditing] = useState(false);
  const { theme, setTheme } = useTheme();
  const { settings, update: updateSettings } = useSettings();
  const focusRef = useRef(0);
  const settingsRef = useRef<SettingsOverlayHandle>(null);
  const managingRef = useRef<ManageProfileOverlayHandle>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    setViewportHeight(window.innerHeight);
    const el = carouselRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setViewportHeight(window.innerHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const loadProfiles = () => {
    if (isElectron()) {
      window.arcade!.getProfiles().then((raw) => {
        setProfiles(
          raw.map((p) => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline || "",
            level: 1,
            avatar: p.avatar || null,
            avatarId: p.avatarId,
            recent: [],
            favorites: [],
          })),
        );
      });
    } else {
      setProfiles(DEMO_PROFILES);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const items = [...profiles, { id: "__new" }];

  const { focus, setFocus } = useArcadeNav({
    count: items.length,
    disabled: !!managing || settingsOpen,
    onConfirm: (i) => {
      if (managing) return;
      const item = items[i];
      if (item.id === "__new") navigate({ to: "/new-user" });
      else {
        navigate({ to: "/library", search: { profile: item.id } });
      }
    },
    onMove: (dir, cur) => {
      if (dir === "right" || dir === "down") return cur + 1;
      if (dir === "left" || dir === "up") return cur - 1;
      return cur;
    },
  });

  focusRef.current = focus;

  useEffect(() => {
    if (!("getGamepads" in navigator)) return;
    let raf = 0;
    let lastY = false;
    let lastX = false;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const yNow = !!pad.buttons[3]?.pressed;
        if (yNow && !lastY && !managing && !settingsOpen) {
          const idx = focusRef.current;
          if (idx < profiles.length) setManaging(profiles[idx]);
        }
        lastY = yNow;
        const xNow = !!pad.buttons[2]?.pressed;
        if (xNow && !lastX && !managing && !settingsOpen) setSettingsOpen(true);
        lastX = xNow;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [profiles, managing, settingsOpen]);

  return (
    <ArcadeShell
      title="Select Player"
      showCredits={settings.showCredits}
      footer={
        <div className="flex w-full items-center justify-center gap-12">
          {settingsOpen ? (
            settingsEditing ? (
              <>
                <ButtonHint
                  action="confirm"
                  label="Confirm"
                  tone="primary"
                  onClick={() => settingsRef.current?.confirm()}
                />
                <ButtonHint action="erase" label="Erase" />
                <ButtonHint
                  action="back"
                  label="Back"
                  onClick={() => settingsRef.current?.cancel()}
                />
              </>
            ) : (
              <>
                <ButtonHint
                  action="confirm"
                  label="Apply Theme"
                  tone="primary"
                  onClick={() => settingsRef.current?.confirm()}
                />
                <ButtonHint
                  action="back"
                  label="Cancel"
                  onClick={() => settingsRef.current?.cancel()}
                />
              </>
            )
          ) : managing ? (
            <>
              <ButtonHint
                action="confirm"
                label="Confirm"
                tone="primary"
                onClick={() => managingRef.current?.confirm()}
              />
              {managingMode === "rename" && (
                <ButtonHint
                  action="erase"
                  label="Erase"
                  onClick={() => managingRef.current?.erase()}
                />
              )}
              <ButtonHint action="back" label="Back" onClick={() => managingRef.current?.back()} />
            </>
          ) : (
            <>
              <ButtonHint
                action="confirm"
                label="Confirm"
                tone="primary"
                onClick={() => {
                  const item = items[focusRef.current];
                  if (item.id === "__new") navigate({ to: "/new-user" });
                  else navigate({ to: "/library", search: { profile: item.id } });
                }}
              />
              <ButtonHint action="back" label="Back" onClick={() => navigate({ to: "/" })} />
              <ButtonHint
                action="manage"
                label="Manage Profile"
                onClick={() => {
                  const p = profiles[focusRef.current];
                  if (p) setManaging(p);
                }}
              />
              <ButtonHint action="erase" label="Settings" onClick={() => setSettingsOpen(true)} />
            </>
          )}
          <NintendoNotice />
        </div>
      }
    >
      <div
        ref={carouselRef}
        className="flex h-full w-full flex-1 items-center px-8 py-4"
        style={{ clipPath: "inset(0 0 0 0)" }}
      >
        <div
          className="flex gap-4 transition-transform duration-300 ease-out shrink-0"
          style={(() => {
            const px8 = 32;
            const gap = 16;
            const cardW = 0.372 * viewportHeight;
            const step = 0.382 * viewportHeight;
            const totalW = (profiles.length + 1) * cardW + profiles.length * gap;
            const maxScroll = Math.max(0, totalW - (containerWidth - 2 * px8));
            const rawOffset = Math.max(0, focus - 1) * step;
            const tx = -Math.min(rawOffset, maxScroll);
            return { transform: `translateX(${containerWidth ? tx : 0}px)` };
          })()}
        >
          {profiles.map((profile, i) => (
            <div
              key={profile.id}
              className="shrink-0"
              style={{ height: "62vh", aspectRatio: "3/5" }}
            >
              <ProfileCard
                profile={profile}
                active={focus === i}
                onHover={() => setFocus(i)}
                onSelect={() => navigate({ to: "/library", search: { profile: profile.id } })}
                delayMs={i * 80}
              />
            </div>
          ))}
          <div className="shrink-0" style={{ height: "62vh", aspectRatio: "3/5" }}>
            <NewUserCard
              active={focus === profiles.length}
              onHover={() => setFocus(profiles.length)}
              onSelect={() => navigate({ to: "/new-user" })}
              delayMs={profiles.length * 80}
            />
          </div>
        </div>
      </div>

      {settingsOpen && (
        <SettingsOverlay
          ref={settingsRef}
          current={theme}
          onChange={setTheme}
          showCredits={settings.showCredits}
          onCreditsToggle={(v) => updateSettings({ showCredits: v })}
          skipBoot={settings.skipBoot}
          onSkipBootToggle={(v) => updateSettings({ skipBoot: v })}
          bootMessage={settings.bootMessage}
          onBootMessageChange={(v) => updateSettings({ bootMessage: v })}
          onEditingChange={setSettingsEditing}
          onClose={() => {
            setSettingsOpen(false);
            setSettingsEditing(false);
          }}
        />
      )}

      {managing && (
        <ManageProfileOverlay
          ref={managingRef}
          profile={managing}
          onModeChange={setManagingMode}
          onClose={() => {
            setManaging(null);
            setManagingMode("menu");
            loadProfiles();
          }}
          onRenamed={(id, name) => {
            setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
            setManaging(null);
          }}
          onDeleted={(id) => {
            setProfiles((ps) => ps.filter((p) => p.id !== id));
            setManaging(null);
          }}
          onAvatarChanged={(id, avatar, avatarId) => {
            setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, avatar, avatarId } : p)));
            setManaging(null);
          }}
          onTaglineChanged={(id, tagline) => {
            setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, tagline } : p)));
            setManaging(null);
          }}
        />
      )}
    </ArcadeShell>
  );
}
