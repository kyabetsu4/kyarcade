import { useEffect, useState } from "react";
import { getGamepad } from "./arcade-bridge";

export type ControllerType = "xbox" | "playstation" | "nintendo" | "generic";

export type ButtonAction = "confirm" | "back" | "erase" | "manage";

const GLYPHS: Record<ControllerType, Record<ButtonAction, string>> = {
  xbox:        { confirm: "A",  back: "B",  erase: "X",  manage: "Y" },
  playstation: { confirm: "✕",  back: "○",  erase: "□",  manage: "△" },
  nintendo:    { confirm: "B",  back: "A",  erase: "Y",  manage: "X" },
  generic:     { confirm: "A",  back: "B",  erase: "X",  manage: "Y" },
};

function detectType(id: string): ControllerType {
  const s = id.toLowerCase();
  if (s.includes("054c") || s.includes("dualsense") || s.includes("dualshock") || s.includes("playstation")) return "playstation";
  if (s.includes("057e") || s.includes("pro controller") || s.includes("joy-con") || s.includes("nintendo")) return "nintendo";
  if (s.includes("045e") || s.includes("xbox") || s.includes("xinput")) return "xbox";
  return "generic";
}

export function useControllerType(): { type: ControllerType; glyph: (action: ButtonAction) => string } {
  const [type, setType] = useState<ControllerType>("generic");

  useEffect(() => {
    if (!("getGamepads" in navigator)) return;

    const update = () => {
      const pad = getGamepad();
      if (pad) setType(detectType(pad.id));
    };

    window.addEventListener("gamepadconnected", update);
    update();
    return () => window.removeEventListener("gamepadconnected", update);
  }, []);

  return { type, glyph: (action) => GLYPHS[type][action] };
}
