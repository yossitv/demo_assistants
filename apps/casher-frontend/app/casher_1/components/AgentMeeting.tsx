"use client";
import { useState, useRef, useEffect } from "react";
import { useCart } from "../providers/CartProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { useConversation } from "../providers/ConversationProvider";
import { PRODUCTS } from "../data/products";
import type { CartItem, Language } from "../types";
import SharedAvatarIframe from "../../components/SharedAvatarIframe";
import styles from "../styles.module.css";

const AUTO_COLLAPSE_MS = 7000;
const AUTO_START = process.env.NEXT_PUBLIC_TAVUS_AUTO_START === "true";

const toTavusLanguage = (language: Language) =>
  language === "ja" ? "japanese" : "english";

const formatProductKnowledge = (language: Language) => {
  const header =
    language === "ja"
      ? "商品ナレッジ（名称・価格・説明）"
      : "Product knowledge (name, price, description)";

  const catalog = PRODUCTS.map((product) => {
    const name = product.name[language];
    const description = product.description[language];
    const price = `¥${product.price.toLocaleString()}`;
    return `- ${name} (${price}): ${description}`;
  }).join("\n");

  return [header, catalog].join("\n");
};

const formatCartContext = (language: Language, items: CartItem[]) => {
  if (items.length === 0) {
    return language === "ja"
      ? "カートは空です。おすすめ提案をしてください。"
      : "Cart is empty; offer a recommendation.";
  }

  const summary = items
    .map(
      (item) =>
        `${item.product.name[language]} x${item.quantity} (¥${item.product.price.toLocaleString()})`,
    )
    .join(", ");

  return language === "ja"
    ? `現在のカート: ${summary}。合計商品数: ${items.length}。`
    : `Current cart: ${summary}. Total items: ${items.length}.`;
};

export function AgentMeeting() {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { language, t } = useLanguage();
  const { items } = useCart();
  const prevLanguage = useRef<Language>(language);
  const isSwitchingLanguage = useRef(false);
  const activeRequestId = useRef(0);
  const { conversationId, setConversationId } = useConversation();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (AUTO_START && !hasStarted.current) {
      startConversation();
    }
  }, []);

  useEffect(() => {
    if (!isConnected || !isExpanded) {
      if (autoCollapseTimer.current) {
        clearTimeout(autoCollapseTimer.current);
        autoCollapseTimer.current = null;
      }
      return;
    }
    autoCollapseTimer.current = setTimeout(() => {
      setIsExpanded(false);
    }, AUTO_COLLAPSE_MS);
    return () => {
      if (autoCollapseTimer.current) {
        clearTimeout(autoCollapseTimer.current);
        autoCollapseTimer.current = null;
      }
    };
  }, [isConnected, isExpanded]);

  useEffect(() => {
    if (!conversationId && isConnected) {
      setIsConnected(false);
      setIsExpanded(false);
      setConversationUrl(null);
      hasStarted.current = false;
    }
  }, [conversationId, isConnected]);

  useEffect(() => {
    if (prevLanguage.current === language) return;
    prevLanguage.current = language;
    if (isSwitchingLanguage.current) return;

    const shouldRestart = isConnected || loading;

    const switchLanguage = async () => {
      isSwitchingLanguage.current = true;
      // Invalidate any in-flight startConversation call.
      activeRequestId.current += 1;
      hasStarted.current = false;

      try {
        if (conversationId) {
          await handleEndSession();
        } else {
          setIsConnected(false);
          setConversationUrl(null);
        }

        if (shouldRestart) {
          await startConversation();
        }
      } finally {
        isSwitchingLanguage.current = false;
      }
    };

    void switchLanguage();
  }, [language, isConnected, loading, conversationId]);

  const startConversation = async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    const requestId = ++activeRequestId.current;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: toTavusLanguage(language),
          properties: {
            participant_left_timeout: 0,
            language: toTavusLanguage(language),
          },
          conversational_context: [
            formatProductKnowledge(language),
            formatCartContext(language, items),
            language === "ja"
              ? "上記の商品ナレッジを参照して接客してください。"
              : "Use the catalog above when assisting the customer.",
          ].join("\n\n"),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start conversation");
      }

      if (activeRequestId.current !== requestId) {
        // A newer request superseded this one (likely due to language switch).
        hasStarted.current = false;
        return;
      }

      if (data.conversation_url && data.conversation_id) {
        setConversationUrl(data.conversation_url);
        setConversationId(data.conversation_id);
        setIsConnected(true);
        setIsExpanded(true);
      } else {
        throw new Error("No conversation_url in response");
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      hasStarted.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleEndSession = async () => {
    if (!conversationId) {
      setIsConnected(false);
      setIsExpanded(false);
      setConversationUrl(null);
      return;
    }
    try {
      await fetch(`/api/conversations/${conversationId}/end`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to end conversation:", err);
    } finally {
      setConversationId(null);
      setConversationUrl(null);
      setIsConnected(false);
      setIsExpanded(false);
      hasStarted.current = false;
    }
  };

  return (
    <>
      <div className={styles.agentCard}>
        <div className={styles.agentShell}>
          {error && <p className={styles.errorMessage}>{error}</p>}
          {!conversationUrl ? (
            <>
              {loading ? (
                <p style={{ color: "#1e293b", fontWeight: 700 }}>
                  {t("店員を呼んでいます...", "Calling staff...")}
                </p>
              ) : (
                <button className={styles.buttonPrimary} onClick={startConversation}>
                  {t("店員を呼ぶ", "Call Staff")}
                </button>
              )}
              <p style={{ fontSize: "0.9rem", color: "#64748b", marginTop: "1rem", fontWeight: 700 }}>
                {t("オーダー内容を共有して、すぐに繋ぎます。", "We share your cart and connect you right away.")}
              </p>
            </>
          ) : (
            <div className={styles.agentInlineAction}>
              <p style={{ color: "#1e293b", fontWeight: 700, margin: 0 }}>
                {t("接続中: ビデオをタップで拡大できます。", "Connected: tap the video to expand.")}
              </p>
              {!isExpanded && conversationUrl && (
                <button
                  className={styles.agentCardExpandSmall}
                  onClick={handleExpand}
                  aria-label={t("ビデオを拡大", "Expand video")}
                  type="button"
                >
                  ⤢
                </button>
              )}
            </div>
          )}

          {conversationUrl && (
            <div
              className={[
                styles.agentIframeShell,
                isExpanded ? styles.agentIframeExpanded : styles.agentIframeInline,
                isConnected ? "" : styles.agentIframeHidden,
              ].join(" ")}
            >
              {isExpanded && (
                <div className={styles.sharedAgentChrome}>
                  <button className={styles.closeButton} onClick={handleCollapse}>
                    ×
                  </button>
                  <button className={styles.endSessionButton} onClick={handleEndSession}>
                    End Tavus
                  </button>
                </div>
              )}
              <SharedAvatarIframe conversationUrl={conversationUrl} />
            </div>
          )}
        </div>
      </div>

      {isConnected && isExpanded && (
        <div className={styles.agentOverlay} onClick={handleCollapse} aria-label="Collapse staff call" />
      )}
    </>
  );
}
