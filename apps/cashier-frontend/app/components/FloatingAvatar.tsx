"use client";
import { useAvatarState } from "../providers/AvatarStateProvider";
import styles from "../styles.module.css";

interface FloatingAvatarProps {
  onExpand?: () => void;
}

export function FloatingAvatar({ onExpand }: FloatingAvatarProps) {
  const { state, expand } = useAvatarState();

  if (!state.isConnected || state.isExpanded || !state.conversationUrl) {
    return null;
  }

  const handleClick = () => {
    expand();
    onExpand?.();
  };

  return (
    <div
      className={`${styles.sharedAvatarFloating} ${styles.floatingAvatarHit}`}
      onClick={handleClick}
      aria-label="Expand Tavus avatar"
      role="button"
    />
  );
}
