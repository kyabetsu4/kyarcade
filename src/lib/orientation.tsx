import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Orientation = "portrait" | "landscape";

type Ctx = {
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  toggle: () => void;
};

const OrientationContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "arcade.orientation";

export function OrientationProvider({ children }: { children: ReactNode }) {
  const [orientation, setOrientationState] = useState<Orientation>("landscape");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Orientation | null;
      if (saved === "portrait" || saved === "landscape") {
        setOrientationState(saved);
      }
    } catch {}
  }, []);

  const setOrientation = (o: Orientation) => {
    setOrientationState(o);
    try {
      localStorage.setItem(STORAGE_KEY, o);
    } catch {}
  };

  const toggle = () =>
    setOrientation(orientation === "portrait" ? "landscape" : "portrait");

  return (
    <OrientationContext.Provider value={{ orientation, setOrientation, toggle }}>
      <div className="min-h-dvh">
        {children}
      </div>
    </OrientationContext.Provider>
  );
}

export function useOrientation() {
  const ctx = useContext(OrientationContext);
  if (!ctx) throw new Error("useOrientation must be used within OrientationProvider");
  return ctx;
}
