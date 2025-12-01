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
        const rating = (4.5 + Math.random() * 0.4).toFixed(1);
        return (
          <div
            key={product.id}
            className={styles.productCard}
            onClick={() => handleCardClick(product)}
          >
            <button
              className={styles.heartButton}
              onClick={(e) => e.stopPropagation()}
            >
              ♡
            </button>
            {product.image && (
              <img
                src={product.image}
                alt={product.name[language]}
                className={styles.productImage}
              />
            )}
            <div className={styles.productBody}>
              <p className={styles.productName}>{product.name[language]}</p>
              <p className={styles.productDescription}>{product.description[language]}</p>
              <div className={styles.productMeta}>
                <span className={styles.rating}>
                  <span style={{ color: "#ff9633" }}>★</span> {rating}
                </span>
                <span className={styles.productPrice}>¥{product.price}</span>
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
        );
      })}
    </div>
  );
}
