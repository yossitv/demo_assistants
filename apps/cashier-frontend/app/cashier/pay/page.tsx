"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    router.push("/cashier/thanks");
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.brand}>
          <Image src="/3dicons/latte-art.png" alt="" width={40} height={40} className={styles.brandIcon3d} />
          <p className={styles.brandLabel}>Hearth Coffee</p>
        </div>
        <LanguageSelector />
      </div>

      <p style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 700, marginBottom: "1.5rem" }}>
        {t("ステップ2: 支払い", "Step 2: Pay")}
      </p>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div className={styles.card}>
          <div style={{ marginBottom: "1.5rem" }}>
            <span style={{ display: "inline-block", padding: "0.375rem 0.875rem", background: "linear-gradient(135deg, #f5b400 0%, #d89900 100%)", color: "#1e293b", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "800", letterSpacing: "0.04em" }}>
              {t("セキュア決済", "Secure checkout")}
            </span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "900", color: "#1e293b", margin: "0.75rem 0 0.5rem 0", letterSpacing: "-0.01em" }}>
              {t("お支払い", "Payment")}
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              {t("税込価格。スタッフが受け取り口で呼びかけます。", "Tax included. We will call your name at pickup.")}
            </p>
          </div>

          <div style={{ margin: "1.5rem 0" }}>
            {items.map((item) => (
              <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 0", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "1.0625rem", fontWeight: "800", color: "#1e293b", margin: "0 0 0.25rem 0" }}>
                    {item.product.name[language]}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>
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
                  <p style={{ fontSize: "1.125rem", fontWeight: "800", color: "#d89900", minWidth: "80px", textAlign: "right", margin: 0 }}>
                    ¥{item.product.price * item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "3px solid #f5b400", display: "flex", justifyContent: "space-between", fontSize: "1.75rem", fontWeight: "900", color: "#1e293b" }}>
            <span>{t("合計", "Total")}</span>
            <span>¥{total}</span>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button className={styles.buttonPrimary} onClick={handlePaid}>
              {t("支払いを確定", "Complete payment")}
            </button>
            <button className={styles.buttonSecondary} onClick={() => router.push("/cashier/order")}>
              {t("注文に戻る", "Back to order")}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "#64748b", marginTop: "1rem" }}>
            {t("現金・ICカード・コード決済はスタッフにお申し付けください。", "Pay here or let staff know if you prefer cash or IC card.")}
          </p>
        </div>
      </div>
    </div>
  );
}
