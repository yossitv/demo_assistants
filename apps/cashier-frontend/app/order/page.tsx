"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../providers/LanguageProvider";
import { useCart } from "../providers/CartProvider";
import { useAvatarState } from "../providers/AvatarStateProvider";
import { AvatarPopup } from "../components/AvatarPopup";
import { FloatingAvatar } from "../components/FloatingAvatar";
import { PRODUCTS } from "../data/products";
import styles from "../styles.module.css";

export default function OrderPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { items, addItem, total } = useCart();
  const { state, connect } = useAvatarState();
  const hasConnected = useRef(false);

  useEffect(() => {
    if (!hasConnected.current && !state.isConnected && !state.isConnecting) {
      hasConnected.current = true;
      const cartContext = items.length > 0
        ? `Customer cart: ${items.map(item => `${item.product.name[language]} x${item.quantity}`).join(", ")}`
        : "Customer just started shopping, cart is empty.";
      connect(language, cartContext);
    }
  }, []);

  const handleBack = () => {
    router.push("/home");
  };

  const handleCheckout = () => {
    router.push("/pay");
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={styles.orderContainer}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          ← {t("戻る", "Back")}
        </button>
        <button className={styles.cartButton}>
          🛒 {itemCount}
        </button>
      </header>

      <div className={styles.productGrid}>
        {PRODUCTS.map((product) => (
          <div
            key={product.id}
            className={styles.productCard}
            onClick={() => addItem(product)}
          >
            {product.image && (
              <img
                src={product.image}
                alt={product.name[language]}
                className={styles.productImage}
              />
            )}
            <div className={styles.productInfo}>
              <div className={styles.productName}>{product.name[language]}</div>
              <div className={styles.productPrice}>¥{product.price.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.bottomBar}>
        <button
          className={styles.checkoutButton}
          onClick={handleCheckout}
          disabled={items.length === 0}
        >
          {t(`カートを見る (${itemCount}点 ¥${total.toLocaleString()})`, `View Cart (${itemCount} items ¥${total.toLocaleString()})`)}
        </button>
      </div>

      {/* Avatar Components */}
      {state.isConnecting && (
        <div className={styles.avatarOverlay}>
          <div className={styles.avatarPopup}>
            <p style={{ padding: "2rem", textAlign: "center" }}>
              {t("接続中...", "Connecting...")}
            </p>
          </div>
        </div>
      )}

      {state.error && (
        <div className={styles.avatarOverlay}>
          <div className={styles.avatarPopup}>
            <div className={styles.errorContainer}>
              <p className={styles.errorMessage}>{t("接続に失敗しました", "Connection failed")}</p>
              <button className={styles.retryButton} onClick={() => {
                hasConnected.current = false;
                const cartContext = items.length > 0
                  ? `Customer cart: ${items.map(item => `${item.product.name[language]} x${item.quantity}`).join(", ")}`
                  : "Customer just started shopping, cart is empty.";
                connect(language, cartContext);
              }}>
                {t("再試行", "Retry")}
              </button>
              <button className={styles.fallbackButton} onClick={() => alert(t("店員を呼びました", "Staff has been called"))}>
                {t("店員を呼ぶ", "Call Staff")}
              </button>
            </div>
          </div>
        </div>
      )}

      <AvatarPopup autoCollapseDelay={5000} />
      <FloatingAvatar />
    </div>
  );
}
