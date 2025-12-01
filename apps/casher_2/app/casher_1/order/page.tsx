"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    router.push("/casher_1/home");
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
        {t("ステップ1: 注文", "Step 1: Order")}
      </p>

      <div className={styles.orderLayout}>
        <div>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#1e293b", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
              {t("商品を選ぶ", "Pick your order")}
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#64748b", lineHeight: 1.6 }}>
              {t(
                "カードをタップして追加・右側で数量調整。おすすめはスタッフに相談できます。",
                "Tap a card to add; adjust quantities on the right. Ask staff anytime for a recommendation."
              )}
            </p>
          </div>
          <ProductList />
        </div>

        <div className={styles.sideStack}>
          <Cart />
          <AgentMeeting />
          <button
            className={styles.buttonPrimary}
            onClick={() => router.push("/casher_1/pay")}
            disabled={items.length === 0}
          >
            {t("支払いへ進む", "Proceed to payment")}
          </button>
          <button className={styles.buttonSecondary} onClick={handleCancel}>
            {t("はじめからやり直す", "Cancel order")}
          </button>
        </div>
      </div>
    </div>
  );
}
