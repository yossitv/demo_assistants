"use client";
import { useRouter } from "next/navigation";
import { useLanguage } from "../providers/LanguageProvider";
import { AvatarPreview } from "../components/AvatarPreview";
import { ModeToggle } from "../components/ModeToggle";
import styles from "../styles.module.css";

export default function HomePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const handleStartOrder = () => {
    router.push("/order");
  };

  return (
    <div className={styles.homeContainer}>
      <h1 className={styles.welcomeTitle}>
        {t("☕ ようこそ", "☕ Welcome")}
      </h1>

      <AvatarPreview />

      <p className={styles.welcomeMessage}>
        {t(
          "何かお困りのことがあれば、いつでもお声がけください",
          "Feel free to ask me anything if you need help"
        )}
      </p>

      <button className={styles.startButton} onClick={handleStartOrder}>
        {t("注文を始める", "Start Order")}
      </button>

      <div className={styles.languageSelector}>
        <button
          className={`${styles.langButton} ${language === "ja" ? styles.langButtonActive : ""}`}
          onClick={() => setLanguage("ja")}
        >
          🇯🇵 日本語
        </button>
        <button
          className={`${styles.langButton} ${language === "en" ? styles.langButtonActive : ""}`}
          onClick={() => setLanguage("en")}
        >
          🇺🇸 English
        </button>
      </div>

      <ModeToggle />
    </div>
  );
}
