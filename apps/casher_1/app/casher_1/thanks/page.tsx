"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../providers/LanguageProvider";
import { useCart } from "../providers/CartProvider";
import styles from "../styles.module.css";

export default function ThanksPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    const timer = setTimeout(() => {
      router.push("/casher_1/home");
    }, 3000);
    return () => clearTimeout(timer);
  }, [clearCart, router]);

  return (
    <div className={styles.thanksShell}>
      <div className={styles.thanksCard}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>☕</div>
        <p style={{ fontSize: "0.875rem", color: "#8D6E63", margin: "0 0 0.5rem 0" }}>
          {t("受け取り口でお待ちください", "Head to the pickup counter")}
        </p>
        <h1 className={styles.thanksTitle}>
          {t("ありがとうございました", "Thank you!")}
        </h1>
        <p className={styles.thanksMessage}>
          {t(
            "すぐにドリンクをお作りします。呼び出しまでこの画面のままお待ちください。",
            "We're preparing your drinks now. Please keep this screen visible until we call you."
          )}
        </p>
        <p style={{ fontSize: "0.875rem", color: "#a1887f" }}>
          {t("数秒でホームに戻ります。", "Returning to the home screen shortly.")}
        </p>
      </div>
    </div>
  );
}
