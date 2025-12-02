"use client";
import { ModeConfig, TavusMode } from "../lib/tavusConfig";
import styles from "../styles.module.css";

interface DebugBadgeProps {
  mode: TavusMode;
  config: ModeConfig;
  conversationId?: string | null;
  isConnected?: boolean;
}

export function DebugBadge({ mode, config, conversationId, isConnected }: DebugBadgeProps) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className={styles.debugBadge}>
      <div>mode: {mode}</div>
      <div>replica: {config.replicaId || "N/A"}</div>
      <div>persona: {config.personaId || "N/A"}</div>
      {conversationId ? <div>ID: {conversationId}</div> : null}
      {typeof isConnected === "boolean" ? <div>connected: {String(isConnected)}</div> : null}
    </div>
  );
}
