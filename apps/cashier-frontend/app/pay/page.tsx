"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../providers/LanguageProvider";
import { useCart } from "../providers/CartProvider";
import { AvatarPopup } from "../components/AvatarPopup";
import { FloatingAvatar } from "../components/FloatingAvatar";
import styles from "../styles.module.css";

export default function PayPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { items, updateQuantity, total, clearCart } = useCart();

  useEffect(() => {
    const hasSavedCart =
      typeof window !== "undefined" && !!localStorage.getItem("casher3_cart");

    if (items.length === 0 && !hasSavedCart) {
      router.replace("/order");
    }
  }, [items.length, router]);

  const handleBack = () => {
    router.push("/order");
  };

  const handlePayment = () => {
    clearCart();
    router.push("/thanks");
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles.payContainer}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          ← {t("戻る", "Back")}
        </button>
        <span style={{ fontWeight: 700 }}>{t("お支払い", "Payment")}</span>
        <div style={{ width: 60 }} />
      </header>

      <div className={styles.cartList}>
        {items.map((item) => (
          <div key={item.product.id} className={styles.cartItem}>
            {item.product.image && (
              <img
                src={item.product.image}
                alt={item.product.name[language]}
                className={styles.cartItemImage}
              />
            )}
            <div className={styles.cartItemInfo}>
              <div className={styles.cartItemName}>{item.product.name[language]}</div>
              <div className={styles.cartItemPrice}>¥{item.product.price.toLocaleString()}</div>
            </div>
            <div className={styles.quantityControls}>
              <button
                className={styles.quantityButton}
                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              >
                -
              </button>
              <span className={styles.quantity}>{item.quantity}</span>
              <button
                className={styles.quantityButton}
                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.totalSection}>
        <div className={styles.totalRow}>
          <span>{t("合計", "Total")}</span>
          <span>¥{total.toLocaleString()}</span>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <button className={styles.checkoutButton} onClick={handlePayment}>
          {t("支払いを完了する", "Complete Payment")}
        </button>
      </div>

      {/* Avatar Components - 維持 */}
      <AvatarPopup autoCollapseDelay={0} />
      <FloatingAvatar />
    </div>
  );
}
