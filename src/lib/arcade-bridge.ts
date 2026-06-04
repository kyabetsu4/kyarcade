export interface AdvancedConfig {
  savePaths: string[];
  allowRename: boolean;
  allowAvatar: boolean;
  allowTagline: boolean;
  allowDelete: boolean;
  requirePasskeys: boolean;
  syncRomDir: boolean;
  advancedPasscode?: string;
  retroarchPath?: string;
}

export const DEFAULT_ADVANCED_CONFIG: AdvancedConfig = {
  savePaths: ["Emulation/saves", "Emulation/states"],
  allowRename: true,
  allowAvatar: true,
  allowTagline: true,
  allowDelete: true,
  requirePasskeys: false,
  syncRomDir: false,
};

export interface ArcadeProfile {
  id: string;
  name: string;
  avatar: string | null;
  avatarId?: string;
  tagline: string;
  passkey?: number[];
  pin?: string;
}

declare global {
  interface Window {
    arcade?: {
      getProfiles: () => Promise<ArcadeProfile[]>;
      launchProfile: (profileName: string) => Promise<{ ok: boolean }>;
      pickAvatar: (profileId: string) => Promise<string | null>;
      saveProfile: (
        profile: Omit<ArcadeProfile, "tagline"> & { tagline?: string },
      ) => Promise<{ ok: boolean }>;
      renameProfile: (profileId: string, newName: string) => Promise<{ ok: boolean }>;
      deleteProfile: (profileId: string) => Promise<{ ok: boolean }>;
      getAdvancedConfig: () => Promise<AdvancedConfig>;
      saveAdvancedConfig: (config: AdvancedConfig) => Promise<{ ok: boolean }>;
      listSubdirs: (relativePath: string) => Promise<string[]>;
    };
  }
}

export const isElectron = () => typeof window !== "undefined" && !!window.arcade;

export const getGamepad = (): Gamepad | null => {
  const pads = [...navigator.getGamepads()].filter((p): p is Gamepad => p !== null);
  return pads.find((p) => p.mapping === "standard") ?? pads[0] ?? null;
};
