"use client";

import { useRouter } from "next/navigation";
import { LanguageSelector } from "../components/LanguageSelector";
import { useLanguage } from "../providers/LanguageProvider";
import { useCart } from "../providers/CartProvider";
import { useConversation } from "../providers/ConversationProvider";
import styles from "../styles.module.css";

export default function PayPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { items, total, updateQuantity } = useCart();
  const { conversationId, setConversationId } = useConversation();

  const handlePaid = async () => {
    if (conversationId) {
      try {
        await fetch(`/api/conversations/${conversationId}/end`, {
          method: "POST",
        });
        setConversationId(null);
      } catch (error) {
        console.error("Failed to end conversation:", error);
      }
    }
    router.push("/casher_nomal/thanks");
  };

  return (
    <div className={styles.container}>
      <div style={{ position: "fixed", top: "2rem", right: "4rem" }}>
        <LanguageSelector />
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "300", color: "#1a1a1a", marginBottom: "2rem" }}>
          {t("お支払い", "Payment")}
        </h1>
        
        <div className={styles.card}>
          {items.map((item) => (
            <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem 0", borderBottom: "1px solid #F5F5F5" }}>
              <div>
                <div style={{ fontWeight: "400", color: "#1a1a1a", marginBottom: "0.25rem" }}>
                  {item.product.name[language]}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#999999" }}>
                  ¥{item.product.price} × {item.quantity}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
                <div style={{ fontWeight: "400", color: "#1a1a1a", minWidth: "80px", textAlign: "right" }}>
                  ¥{item.product.price * item.quantity}
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "2px solid #E5E5E5", display: "flex", justifyContent: "space-between", fontSize: "1.5rem", fontWeight: "300", color: "#1a1a1a" }}>
            <span>{t("合計", "Total")}</span>
            <span>¥{total}</span>
          </div>

          <button 
            className={styles.buttonPrimary} 
            onClick={handlePaid}
          >
            {t("支払い完了", "Complete Payment")}
          </button>
        </div>
      </div>
    </div>
  );
}
