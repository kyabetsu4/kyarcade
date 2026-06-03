export const AVATAR_GRADIENTS: Record<string, [string, string]> = {
  broccoli:    ["#2d6a4f", "#1b4332"],
  carrot:      ["#e76f00", "#9c4000"],
  corn:        ["#f4c430", "#b8860b"],
  eggplant:    ["#6b2fa0", "#3b1060"],
  mushroom:    ["#8b5e3c", "#4a2c0a"],
  pepper:      ["#c0392b", "#7b0d0d"],
  potato:      ["#a0785a", "#5c3d2e"],
  tomato:      ["#e74c3c", "#922b21"],
  cabbage:     ["#5a8a3c", "#2d4f1e"],
  avocado:     ["#4a7c3f", "#2b4a1a"],
  cucumber:    ["#4caf50", "#1b5e20"],
  onion:       ["#c9a96e", "#7b5e2a"],
  garlic:      ["#d4c5a9", "#8a7560"],
  peanuts:     ["#c8a96e", "#7a5c2e"],
  chestnut:    ["#8b4513", "#4a1c00"],
  blueberries: ["#3f51b5", "#1a237e"],
};

export const DEFAULT_GRADIENT: [string, string] = ["#2d2d3a", "#1a1a2e"];

export function getAvatarGradient(avatarId?: string): [string, string] {
  if (avatarId && AVATAR_GRADIENTS[avatarId]) return AVATAR_GRADIENTS[avatarId];
  return DEFAULT_GRADIENT;
}
