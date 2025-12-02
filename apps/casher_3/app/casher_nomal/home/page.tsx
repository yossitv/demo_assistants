"use client";

import { useRouter } from "next/navigation";
import { LanguageSelector } from "../components/LanguageSelector";
import { useLanguage } from "../providers/LanguageProvider";
import styles from "../styles.module.css";

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className={styles.homeContainer}>
      <div style={{ position: "fixed", top: "2rem", right: "4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button
          className={styles.modeButton}
          onClick={() => router.push("/casher_halloween/home")}
        >
          🎃
        </button>
        <LanguageSelector />
      </div>

      <h1 className={styles.homeTitle}>
        {t("セルフレジへようこそ", "Welcome to Self-Checkout")}
      </h1>

      <button
        className={styles.startButton}
        onClick={() => router.push("/casher_nomal/order")}
      >
        {t("注文を開始", "Start Order")}
      </button>

    </div>
  );
}
