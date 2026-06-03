export interface ArcadeProfile {
  id: string;
  name: string;
  avatar: string | null;
  avatarId?: string;
  tagline: string;
}

declare global {
  interface Window {
    arcade?: {
      getProfiles: () => Promise<ArcadeProfile[]>;
      launchProfile: (profileName: string) => Promise<{ ok: boolean }>;
      pickAvatar: (profileId: string) => Promise<string | null>;
      saveProfile: (profile: Omit<ArcadeProfile, 'tagline'> & { tagline?: string }) => Promise<{ ok: boolean }>;
      renameProfile: (profileId: string, newName: string) => Promise<{ ok: boolean }>;
      deleteProfile: (profileId: string) => Promise<{ ok: boolean }>;
    };
  }
}

export const isElectron = () => typeof window !== "undefined" && !!window.arcade;

export const getGamepad = (): Gamepad | null => {
  const pads = [...navigator.getGamepads()].filter((p): p is Gamepad => p !== null);
  return pads.find(p => p.mapping === "standard") ?? pads[0] ?? null;
};
