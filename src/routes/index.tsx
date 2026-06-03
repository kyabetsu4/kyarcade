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
import { AdvancedOptionsOverlay } from "@/components/arcade/AdvancedOptionsOverlay";
import { PasskeyOverlay } from "@/components/arcade/PasskeyOverlay";
import { PinEntryOverlay } from "@/components/arcade/PinEntryOverlay";
import { NintendoNotice } from "@/components/arcade/NintendoNotice";
import { type Profile } from "@/lib/arcade-data";
import { useArcadeNav } from "@/lib/use-arcade-nav";
import {
  isElectron,
  getGamepad,
  DEFAULT_ADVANCED_CONFIG,
  type AdvancedConfig,
} from "@/lib/arcade-bridge";
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>(DEFAULT_ADVANCED_CONFIG);
  const [passkeyProfile, setPasskeyProfile] = useState<Profile | null>(null);
  const [passkeyMode, setPasskeyMode] = useState<"set" | "enter">("enter");
  const [advancedPinOpen, setAdvancedPinOpen] = useState(false);
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
            passkey: p.passkey,
            pin: p.pin,
            recent: [],
            favorites: [],
          })),
        );
      });
    } else {
      setProfiles(DEMO_PROFILES);
    }
  };

  const loadAdvancedConfig = () => {
    if (isElectron()) {
      window.arcade!.getAdvancedConfig().then(setAdvancedConfig);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadAdvancedConfig();
  }, []);

  const items = [...profiles, { id: "__new" }];

  const selectProfile = (profile: Profile) => {
    if (advancedConfig.requirePasskeys) {
      const hasPasskey = profile.passkey && profile.passkey.length > 0;
      const hasPin = !!profile.pin;
      if (!hasPasskey && !hasPin) {
        setPasskeyMode("set");
        setPasskeyProfile(profile);
      } else {
        setPasskeyMode("enter");
        setPasskeyProfile(profile);
      }
    } else {
      navigate({ to: "/library", search: { profile: profile.id } });
    }
  };

  const openAdvanced = () => {
    if (advancedConfig.advancedPasscode) {
      setAdvancedPinOpen(true);
    } else {
      openAdvanced();
    }
  };

  const { focus, setFocus } = useArcadeNav({
    count: items.length,
    disabled: !!managing || settingsOpen || advancedOpen || !!passkeyProfile || advancedPinOpen,
    onConfirm: (i) => {
      if (managing) return;
      const item = items[i];
      if (item.id === "__new") navigate({ to: "/new-user" });
      else {
        selectProfile(item as Profile);
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
    let lastCombo = false;
    const tick = () => {
      const pad = getGamepad();
      if (pad) {
        const anyOpen = !!managing || settingsOpen || advancedOpen || !!passkeyProfile || advancedPinOpen;
        const yNow = !!pad.buttons[3]?.pressed;
        const canManage =
          advancedConfig.allowRename ||
          advancedConfig.allowTagline ||
          advancedConfig.allowAvatar ||
          advancedConfig.allowDelete;
        if (yNow && !lastY && !anyOpen && canManage) {
          const idx = focusRef.current;
          if (idx < profiles.length) setManaging(profiles[idx]);
        }
        lastY = yNow;
        const xNow = !!pad.buttons[2]?.pressed;
        if (xNow && !lastX && !anyOpen) setSettingsOpen(true);
        lastX = xNow;
        // LT + RT + D-pad right: owner-only combo to open Advanced Options
        const ltNow = (pad.buttons[6]?.value ?? 0) > 0.5;
        const rtNow = (pad.buttons[7]?.value ?? 0) > 0.5;
        const dRightNow = !!pad.buttons[15]?.pressed;
        const comboNow = ltNow && rtNow && dRightNow;
        if (comboNow && !lastCombo && !anyOpen) openAdvanced();
        lastCombo = comboNow;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [profiles, managing, settingsOpen, advancedOpen, passkeyProfile, advancedPinOpen]);

  return (
    <ArcadeShell
      title="Select Player"
      showCredits={settings.showCredits}
      onAdvanced={() => openAdvanced()}
      footer={
        <div className="flex w-full items-center justify-center gap-12">
          {(passkeyProfile || advancedPinOpen || advancedOpen) ? (
            passkeyProfile ? <ButtonHint action="back" glyph="B" label="Hold to Cancel" /> : null
          ) : settingsOpen ? (
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
                  else selectProfile(item as Profile);
                }}
              />
              <ButtonHint action="back" label="Back" onClick={() => navigate({ to: "/" })} />
              {(advancedConfig.allowRename ||
                advancedConfig.allowTagline ||
                advancedConfig.allowAvatar ||
                advancedConfig.allowDelete) && (
                <ButtonHint
                  action="manage"
                  label="Manage Profile"
                  onClick={() => {
                    const p = profiles[focusRef.current];
                    if (p) setManaging(p);
                  }}
                />
              )}
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
                onSelect={() => selectProfile(profile)}
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

      {advancedOpen && (
        <AdvancedOptionsOverlay
          onClose={() => {
            setAdvancedOpen(false);
            loadAdvancedConfig();
          }}
        />
      )}

      {passkeyProfile && passkeyMode === "set" && (
        <PasskeyOverlay
          mode="set"
          profileName={passkeyProfile.name}
          onSet={async (result) => {
            const updated = {
              ...passkeyProfile,
              passkey: result.type === "gamepad" ? result.passkey : undefined,
              pin: result.type === "pin" ? result.pin : undefined,
            };
            if (isElectron()) {
              await window.arcade!.saveProfile(updated);
            }
            setProfiles((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
            setPasskeyProfile(null);
            navigate({ to: "/library", search: { profile: passkeyProfile.id } });
          }}
          onCancel={() => setPasskeyProfile(null)}
        />
      )}

      {passkeyProfile && passkeyMode === "enter" && (
        <PasskeyOverlay
          mode="enter"
          profileName={passkeyProfile.name}
          passkey={passkeyProfile.passkey}
          pin={passkeyProfile.pin}
          onSuccess={() => {
            const id = passkeyProfile.id;
            setPasskeyProfile(null);
            navigate({ to: "/library", search: { profile: id } });
          }}
          onCancel={() => setPasskeyProfile(null)}
        />
      )}

      {advancedPinOpen && (
        <PinEntryOverlay
          title="Advanced Options"
          onSuccess={() => { setAdvancedPinOpen(false); setAdvancedOpen(true); }}
          onCancel={() => setAdvancedPinOpen(false)}
          check={(pin) => pin === advancedConfig.advancedPasscode}
        />
      )}

      {managing && (
        <ManageProfileOverlay
          ref={managingRef}
          profile={managing}
          permissions={advancedConfig}
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
