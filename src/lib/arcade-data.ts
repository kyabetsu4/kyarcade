export type Profile = {
  id: string;
  name: string;
  tagline: string;
  level: number;
  avatar: string | null;
  avatarId?: string;
  recent: string[];
  favorites: string[];
};
