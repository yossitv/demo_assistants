"use client";

import { useCart } from "../providers/CartProvider";
import { useLanguage } from "../providers/LanguageProvider";
import styles from "../styles.module.css";

export function Cart() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const { language, t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className={styles.cartPanel}>
        <div className={styles.cartTitle}>{t("カート", "Cart")}</div>
        <p style={{ color: "#999999", fontSize: "0.875rem", textAlign: "center", padding: "2rem 0" }}>
          {t("商品がありません", "No items")}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.cartPanel}>
      <div className={styles.cartTitle}>{t("カート", "Cart")}</div>
      {items.map((item) => (
        <div key={item.product.id} className={styles.cartItem}>
          <div className={styles.cartItemInfo}>
            <div className={styles.cartItemName}>{item.product.name[language]}</div>
            <div className={styles.cartItemPrice}>¥{item.product.price}</div>
          </div>
          <div className={styles.quantityControl}>
            <button
              className={styles.quantityButton}
              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
            >
              −
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
      <div className={styles.cartTotal}>
        <span>{t("合計", "Total")}</span>
        <span>¥{total}</span>
      </div>
    </div>
  );
}
