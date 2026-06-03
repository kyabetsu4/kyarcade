const modules = import.meta.glob("../assets/avatars/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const byCode: Record<string, string> = {};
for (const [filePath, url] of Object.entries(modules)) {
  const code = filePath.split("/").pop()!.replace(".svg", "");
  byCode[code] = url;
}

/** Resolve an OpenMoji codepoint (e.g. "1F344") to its bundled asset URL. */
export const avatarUrl = (code: string): string => byCode[code];

export const DEFAULT_AVATARS = [
  { id: "broccoli", label: "Broccoli", url: avatarUrl("1F966") },
  { id: "carrot", label: "Carrot", url: avatarUrl("1F955") },
  { id: "corn", label: "Corn", url: avatarUrl("1F33D") },
  { id: "eggplant", label: "Eggplant", url: avatarUrl("1F346") },
  { id: "mushroom", label: "Mushroom", url: avatarUrl("1F344") },
  { id: "pepper", label: "Pepper", url: avatarUrl("1F336") },
  { id: "potato", label: "Potato", url: avatarUrl("1F954") },
  { id: "tomato", label: "Tomato", url: avatarUrl("1F345") },
  { id: "cabbage", label: "Cabbage", url: avatarUrl("1F96C") },
  { id: "avocado", label: "Avocado", url: avatarUrl("1F951") },
  { id: "cucumber", label: "Cucumber", url: avatarUrl("1F952") },
  { id: "onion", label: "Onion", url: avatarUrl("1F9C5") },
  { id: "garlic", label: "Garlic", url: avatarUrl("1F9C4") },
  { id: "peanuts", label: "Peanuts", url: avatarUrl("1F95C") },
  { id: "chestnut", label: "Chestnut", url: avatarUrl("1F330") },
  { id: "blueberries", label: "Blueberries", url: avatarUrl("1FAD0") },
];
