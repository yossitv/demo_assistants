"use client";

import { useState, useEffect, useRef } from "react";
import { useCart } from "../providers/CartProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { useConversation } from "../providers/ConversationProvider";

const AUTO_START = process.env.NEXT_PUBLIC_TAVUS_AUTO_START === "true";

export function AgentMeeting() {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { items } = useCart();
  const { language, t } = useLanguage();
  const { setConversationId } = useConversation();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (AUTO_START && !hasStarted.current) {
      hasStarted.current = true;
      startConversation();
    }
  }, []);

  const startConversation = async () => {
    if (hasStarted.current && !AUTO_START) return;
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
      <div style={{ padding: "1rem", background: "rgba(255,255,255,0.1)", borderRadius: "8px", textAlign: "center" }}>
        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}
        {loading ? (
          <p style={{ color: "#666666" }}>{t("店員を呼んでいます...", "Calling staff...")}</p>
        ) : (
          <button
            onClick={startConversation}
            style={{
              width: "100%",
              padding: "1rem",
              background: "#1a1a1a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              cursor: "pointer"
            }}
          >
            {t("店員を呼ぶ", "Call Staff")}
          </button>
        )}
      </div>
    );
  }

  return (
    <iframe
      src={conversationUrl}
      allow="camera; microphone; autoplay; clipboard-read; clipboard-write; display-capture"
      style={{ width: "100%", height: "400px", border: "none", borderRadius: "8px" }}
    />
  );
}
