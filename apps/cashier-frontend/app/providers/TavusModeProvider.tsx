"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_TAVUS_MODE,
  MODE_CONFIGS,
  ModeConfig,
  TavusMode,
} from "../lib/tavusConfig";

type TavusModeContextValue = {
  mode: TavusMode;
  config: ModeConfig;
  setMode: (mode: TavusMode) => void;
  isValid: boolean;
  error: string | null;
};

const STORAGE_KEY = "casher-3:tavus-mode";
const DEFAULT_MODE: TavusMode = DEFAULT_TAVUS_MODE;

const defaultValue: TavusModeContextValue = {
  mode: DEFAULT_MODE,
  config: MODE_CONFIGS[DEFAULT_MODE],
  setMode: () => {},
  isValid: true,
  error: null,
};

const TavusModeContext = createContext<TavusModeContextValue>(defaultValue);

export function TavusModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TavusMode>(defaultValue.mode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "default" || stored === "halloween") {
      setModeState(stored);
    }
  }, []);

  const setMode = (next: TavusMode) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const config = useMemo<ModeConfig>(
    () => MODE_CONFIGS[mode] ?? MODE_CONFIGS.default,
    [mode],
  );

  const hasConfig = Boolean(config.replicaId || config.personaId);
  const requireConfig =
    process.env.NEXT_PUBLIC_REQUIRE_TAVUS_CONFIG === "true";
  const isValid = hasConfig || !requireConfig;
  const error = isValid
    ? null
    : "Tavus設定が不足しています (replica_id または persona_id が必要です)";

  const value = useMemo(
    () => ({
      mode,
      config,
      setMode,
      isValid,
      error,
    }),
    [mode, config, isValid, error],
  );

  return (
    <TavusModeContext.Provider value={value}>
      {children}
    </TavusModeContext.Provider>
  );
}

export function useTavusMode() {
  return useContext(TavusModeContext);
}
