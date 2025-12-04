"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { FlowState } from "../types";
import { useRouter } from "next/navigation";

interface FlowContextType {
  state: FlowState;
  goToNext: () => void;
  goToPrevious: () => void;
  reset: () => void;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

const FLOW_ORDER: FlowState[] = ["home", "order", "pay", "thanks"];

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>("home");
  const router = useRouter();

  const goToNext = () => {
    const currentIndex = FLOW_ORDER.indexOf(state);
    if (currentIndex < FLOW_ORDER.length - 1) {
      const nextState = FLOW_ORDER[currentIndex + 1];
      setState(nextState);
      router.push(`/casher_nomal/${nextState}`);
    }
  };

  const goToPrevious = () => {
    const currentIndex = FLOW_ORDER.indexOf(state);
    if (currentIndex > 0) {
      const prevState = FLOW_ORDER[currentIndex - 1];
      setState(prevState);
      router.push(`/casher_nomal/${prevState}`);
    }
  };

  const reset = () => {
    setState("home");
    router.push("/casher_nomal/home");
  };

  return (
    <FlowContext.Provider value={{ state, goToNext, goToPrevious, reset }}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) throw new Error("useFlow must be used within FlowProvider");
  return context;
}
