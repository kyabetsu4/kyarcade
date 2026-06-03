// Self-hosted OpenMoji avatar SVGs, bundled by Vite so the app renders fully
// offline (no CDN). Files live in src/assets/avatars/<codepoint>.svg.
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
