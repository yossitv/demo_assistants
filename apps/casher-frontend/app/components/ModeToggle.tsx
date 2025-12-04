"use client";
import { TavusMode } from "../lib/tavusConfig";
import { useTavusMode } from "../providers/TavusModeProvider";
import styles from "../styles.module.css";

export function ModeToggle() {
  const { mode, setMode, isValid, error } = useTavusMode();

  const handleChange = (next: TavusMode) => {
    if (next === mode) return;
    setMode(next);
  };

  return (
    <div className={styles.modeToggle}>
      <div className={styles.modeToggleLabel}>モード</div>
      <div className={styles.modeButtons}>
        <button
          className={`${styles.modeButton} ${mode === "default" ? styles.modeButtonActive : ""}`}
          onClick={() => handleChange("default")}
        >
          通常
        </button>
        <button
          className={`${styles.modeButton} ${mode === "halloween" ? styles.modeButtonActive : ""}`}
          onClick={() => handleChange("halloween")}
        >
          ハロウィン
        </button>
      </div>
      {!isValid && error && <div className={styles.modeError}>{error}</div>}
    </div>
  );
}
