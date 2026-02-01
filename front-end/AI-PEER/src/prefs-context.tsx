// src/prefs-context.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorsByContrast, scaleFontSizes } from "./theme";

// Shared simple preferences type
export type Prefs = {
  fontScale: number;
  contrast: "light" | "dark" | "high";
  language: "en" | "es" | "fr";
  soundAlerts: boolean;
};

const PREFS_KEY = "accessibility_prefs_v1";

const DEFAULT_PREFS: Prefs = {
  fontScale: 1,
  contrast: "light",
  language: "en",
  soundAlerts: true,
};

// setPrefs updates entire Prefs object
// updatePrefs updates a single key (attribute) within Prefs
type PrefsContextValue = {
  prefs: Prefs;
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>;
  updatePrefs: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  scaled: ReturnType<typeof scaleFontSizes>;
  colors: (typeof colorsByContrast)[Prefs["contrast"]];
  isLoaded: boolean;
};

const PrefsContext = createContext<PrefsContextValue | undefined>(undefined);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load once
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Prefs;
          setPrefs((p) => ({ ...p, ...parsed }));
        }
      } catch {
        // no-op
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist whenever prefs change
  useEffect(() => {
    if (!isLoaded) return; // avoid writing immediately over initial load
    (async () => {
      try {
        await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        // no-op
      }
    })();
  }, [prefs, isLoaded]);

  const updatePrefs = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const scaled = useMemo(() => scaleFontSizes(prefs.fontScale), [prefs.fontScale]);
  const colors = colorsByContrast[prefs.contrast];

  const value: PrefsContextValue = {
    prefs,
    setPrefs,
    updatePrefs,
    scaled,
    colors,
    isLoaded,
  };

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    throw new Error("usePrefs must be used inside PrefsProvider");
  }
  return ctx;
}
