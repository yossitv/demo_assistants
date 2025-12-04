"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../providers/LanguageProvider";
import { useAvatarState } from "../providers/AvatarStateProvider";
import styles from "../styles.module.css";

export default function ThanksPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { disconnect } = useAvatarState();

  useEffect(() => {
    disconnect();
  }, [disconnect]);

  const handleHome = () => {
    router.push("/home");
  };

  return (
    <div className={styles.thanksContainer}>
      <div className={styles.thanksIcon}>🎉</div>
      <h1 className={styles.thanksTitle}>
        {t("ありがとうございました！", "Thank you!")}
      </h1>
      <p className={styles.thanksMessage}>
        {t(
          "ご注文を承りました。\nまたのご来店をお待ちしております。",
          "Your order has been placed.\nWe look forward to seeing you again."
        )}
      </p>
      <button className={styles.homeButton} onClick={handleHome}>
        {t("ホームに戻る", "Back to Home")}
      </button>
    </div>
  );
}
