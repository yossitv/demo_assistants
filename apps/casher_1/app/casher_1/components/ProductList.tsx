"use client";
import { useCart } from "../providers/CartProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { PRODUCTS } from "../data/products";
import styles from "../styles.module.css";

export function ProductList() {
  const { items, addItem, updateQuantity } = useCart();
  const { language, t } = useLanguage();

  const getQuantity = (productId: string) => {
    return items.find(item => item.product.id === productId)?.quantity || 0;
  };

  const handleCardClick = (product: any) => {
    const quantity = getQuantity(product.id);
    if (quantity === 0) {
      addItem(product);
    } else {
      updateQuantity(product.id, quantity + 1);
    }
  };

  return (
    <div className={styles.productGrid}>
      {PRODUCTS.map((product) => {
        const quantity = getQuantity(product.id);
        return (
          <div
            key={product.id}
            className={styles.productCard}
            onClick={() => handleCardClick(product)}
            style={{ cursor: "pointer" }}
          >
            {product.image && (
              <img
                src={product.image}
                alt={product.name[language]}
                className={styles.productImage}
              />
            )}
            <div className={styles.productBody}>
              <div className={styles.productNameRow}>
                <div>
                  <div className={styles.productName}>{product.name[language]}</div>
                  <div className={styles.productDescription}>{product.description[language]}</div>
                </div>
                <div className={styles.productPrice}>¥{product.price}</div>
              </div>
              <div className={styles.productFooter}>
                <div className={styles.productHint}>
                  {quantity > 0 ? t("カートに追加済み", "In your cart") : t("タップで追加", "Tap to add")}
                </div>
                {quantity > 0 && (
                  <div
                    className={styles.quantityControl}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className={styles.quantityButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(product.id, quantity - 1);
                      }}
                    >
                      −
                    </button>
                    <span className={styles.quantity}>{quantity}</span>
                    <button
                      className={styles.quantityButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(product.id, quantity + 1);
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
