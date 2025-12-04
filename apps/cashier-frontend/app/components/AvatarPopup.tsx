"use client";
import { useEffect, useRef } from "react";
import { useAvatarState } from "../providers/AvatarStateProvider";
import styles from "../styles.module.css";

interface AvatarPopupProps {
  autoCollapseDelay?: number;
  onCollapse?: () => void;
}

export function AvatarPopup({ autoCollapseDelay = 5000, onCollapse }: AvatarPopupProps) {
  const { state, collapse } = useAvatarState();
  const hasAutoCollapsed = useRef(false);

  useEffect(() => {
    if (!state.isConnected) {
      hasAutoCollapsed.current = false;
    }
  }, [state.isConnected]);

  useEffect(() => {
    if (state.isConnected && state.isExpanded && autoCollapseDelay > 0 && !hasAutoCollapsed.current) {
      const timer = setTimeout(() => {
        hasAutoCollapsed.current = true;
        collapse();
        onCollapse?.();
      }, autoCollapseDelay);
      return () => clearTimeout(timer);
    }
  }, [state.isConnected, state.isExpanded, autoCollapseDelay, collapse, onCollapse]);

  if (!state.conversationUrl) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      collapse();
    }
  };

  const isOpen = state.isConnected && state.isExpanded;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`${styles.avatarOverlay} ${styles.avatarOverlayVisible}`}
      onClick={handleOverlayClick}
    />
  );
}
