"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../providers/LanguageProvider";
import { useCart } from "../providers/CartProvider";
import { useFlow } from "../providers/FlowProvider";
import styles from "../styles.module.css";

export default function ThanksPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { clearCart } = useCart();
  const { reset } = useFlow();

  useEffect(() => {
    clearCart();
    const timer = setTimeout(() => {
      reset();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.thanksContainer}>
      <h1 className={styles.thanksTitle}>
        {t("ありがとうございました", "Thank You")}
      </h1>
      <p className={styles.thanksMessage}>
        {t("またのご利用をお待ちしております", "We look forward to serving you again")}
      </p>
    </div>
  );
}
