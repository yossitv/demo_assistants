"use client";

import { useRouter } from "next/navigation";
import { ProductList } from "../components/ProductList";
import { Cart } from "../components/Cart";
import { AgentMeeting } from "../components/AgentMeeting";
import { LanguageSelector } from "../components/LanguageSelector";
import { useLanguage } from "../providers/LanguageProvider";
import { useCart } from "../providers/CartProvider";
import { useConversation } from "../providers/ConversationProvider";
import styles from "../styles.module.css";

export default function OrderPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { items, clearCart } = useCart();
  const { conversationId, setConversationId } = useConversation();

  const handleCancel = async () => {
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
    clearCart();
    router.push("/casher_nomal/home");
  };

  return (
    <div className={styles.container}>
      <div style={{ position: "fixed", top: "2rem", right: "4rem", zIndex: 10 }}>
        <LanguageSelector />
      </div>

      <div className={styles.orderLayout}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "300", color: "#1a1a1a", marginBottom: "2rem" }}>
            {t("商品を選択", "Select Products")}
          </h1>
          <ProductList />
        </div>

        <div>
          <div className={styles.agentMeeting}>
            <AgentMeeting />
          </div>
          <Cart />
          <button 
            className={styles.buttonPrimary} 
            onClick={() => router.push("/casher_nomal/pay")}
            disabled={items.length === 0}
          >
            {t("支払いへ", "Proceed to Payment")}
          </button>
          <button 
            className={styles.buttonSecondary} 
            onClick={handleCancel}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {t("キャンセル", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
