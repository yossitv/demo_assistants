"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
      router.push("/cashier/home");
    }, 3000);
    return () => clearTimeout(timer);
  }, [clearCart, router]);

  return (
    <div className={styles.thanksShell}>
      <div className={styles.thanksCard}>
        <Image src="/3dicons/57aba15c7ee837298544a9be4978d488539683a0.png" alt="" width={80} height={80} style={{ marginBottom: "1rem" }} />
        <p style={{ fontSize: "0.9rem", color: "#64748b", margin: "0 0 0.5rem 0", fontWeight: 700 }}>
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
        <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
          {t("数秒でホームに戻ります。", "Returning to the home screen shortly.")}
        </p>
      </div>
    </div>
  );
}
