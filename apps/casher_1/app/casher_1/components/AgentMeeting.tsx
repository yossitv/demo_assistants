"use client";
import { useState, useRef } from "react";
import { useCart } from "../providers/CartProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { useConversation } from "../providers/ConversationProvider";
import styles from "../styles.module.css";

export function AgentMeeting() {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { items } = useCart();
  const { language, t } = useLanguage();
  const { setConversationId } = useConversation();
  const hasStarted = useRef(false);

  const startConversation = async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: language === "ja" ? "japanese" : "english",
          conversational_context: `Customer cart: ${items.map(item => `${item.product.name[language]} x${item.quantity} (¥${item.product.price})`).join(", ")}. Total items: ${items.length}.`
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start conversation");
      }

      if (data.conversation_url && data.conversation_id) {
        setConversationUrl(data.conversation_url);
        setConversationId(data.conversation_id);
      } else {
        throw new Error("No conversation_url in response");
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      hasStarted.current = false;
    } finally {
      setLoading(false);
    }
  };

  if (!conversationUrl) {
    return (
      <div className={styles.agentCard}>
        <div className={styles.agentShell}>
          {error && <p className={styles.errorMessage}>{error}</p>}
          {loading ? (
            <p style={{ color: "#8D6E63" }}>
              {t("店員を呼んでいます...", "Calling staff...")}
            </p>
          ) : (
            <button className={styles.buttonPrimary} onClick={startConversation}>
              {t("店員を呼ぶ", "Call Staff")}
            </button>
          )}
          <p style={{ fontSize: "0.875rem", color: "#a1887f", marginTop: "1rem" }}>
            {t(
              "オーダー内容を共有して、すぐに繋ぎます。",
              "We share your cart and connect you right away."
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.agentCard}>
      <div className={styles.agentFrame}>
        <iframe
          src={conversationUrl}
          className={styles.agentIframe}
          allow="camera; microphone; autoplay; clipboard-read; clipboard-write; display-capture"
        />
      </div>
    </div>
  );
}
