"use client";
import { useState } from "react";
import { useLanguage } from "../providers/LanguageProvider";
import styles from "../styles.module.css";

const languages = [
  { code: "ja" as const, label: "日本語" },
  { code: "en" as const, label: "English" },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.languageSelector}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`${styles.languageButton} ${language === lang.code ? styles.active : ""}`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
