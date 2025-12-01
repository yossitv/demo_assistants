"use client";
import { useTheme } from "../providers/ThemeProvider";
import styles from "../styles.module.css";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} className={styles.themeToggle}>
      {theme === "cafe" ? "🎃" : "☕"}
    </button>
  );
}
