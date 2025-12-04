"use client";

import { useLanguage } from "../providers/LanguageProvider";
import styles from "../styles.module.css";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={styles.languageSelector}>
      <button
        className={`${styles.languageButton} ${language === "ja" ? styles.active : ""}`}
        onClick={() => setLanguage("ja")}
      >
        日本語
      </button>
      <button
        className={`${styles.languageButton} ${language === "en" ? styles.active : ""}`}
        onClick={() => setLanguage("en")}
      >
        English
      </button>
    </div>
  );
}
