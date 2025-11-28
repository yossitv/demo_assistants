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
    router.push("/casher_1/thanks");
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}></div>
          <p className={styles.brandLabel}>Hearth Coffee</p>
        </div>
        <LanguageSelector />
      </div>

      <p style={{ fontSize: "0.875rem", color: "#8D6E63", marginBottom: "1.5rem" }}>
        {t("ステップ2: 支払い", "Step 2: Pay")}
      </p>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div className={styles.card}>
          <div style={{ marginBottom: "1.5rem" }}>
            <span style={{ display: "inline-block", padding: "0.375rem 0.875rem", background: "linear-gradient(135deg, #8B5A2B 0%, #A0522D 100%)", color: "#ffffff", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600" }}>
              {t("セキュア決済", "Secure checkout")}
            </span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#4E342E", margin: "0.75rem 0 0.5rem 0" }}>
              {t("お支払い", "Payment")}
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#8D6E63", margin: 0 }}>
              {t("税込価格。スタッフが受け取り口で呼びかけます。", "Tax included. We will call your name at pickup.")}
            </p>
          </div>

          <div style={{ margin: "1.5rem 0" }}>
            {items.map((item) => (
              <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 0", borderBottom: "1px solid #f0e6dc" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "1.0625rem", fontWeight: "600", color: "#4E342E", margin: "0 0 0.25rem 0" }}>
                    {item.product.name[language]}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "#8D6E63", margin: 0 }}>
                    ¥{item.product.price} × {item.quantity}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
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
                  <p style={{ fontSize: "1.125rem", fontWeight: "700", color: "#8B5A2B", minWidth: "80px", textAlign: "right", margin: 0 }}>
                    ¥{item.product.price * item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "3px solid #8B5A2B", display: "flex", justifyContent: "space-between", fontSize: "1.75rem", fontWeight: "800", color: "#4E342E" }}>
            <span>{t("合計", "Total")}</span>
            <span>¥{total}</span>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button className={styles.buttonPrimary} onClick={handlePaid}>
              {t("支払いを確定", "Complete payment")}
            </button>
            <button className={styles.buttonSecondary} onClick={() => router.push("/casher_1/order")}>
              {t("注文に戻る", "Back to order")}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "#a1887f", marginTop: "1rem" }}>
            {t("現金・ICカード・コード決済はスタッフにお申し付けください。", "Pay here or let staff know if you prefer cash or IC card.")}
          </p>
        </div>
      </div>
    </div>
  );
}
