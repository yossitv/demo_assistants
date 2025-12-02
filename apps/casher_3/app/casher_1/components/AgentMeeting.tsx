"use client";
import { useState, useRef, useEffect } from "react";
import { useCart } from "../providers/CartProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { useConversation } from "../providers/ConversationProvider";
import SharedAvatarIframe from "../../components/SharedAvatarIframe";
import styles from "../styles.module.css";

const AUTO_COLLAPSE_MS = 7000;
const AUTO_START = process.env.NEXT_PUBLIC_TAVUS_AUTO_START === "true";

export function AgentMeeting() {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { items } = useCart();
  const { language, t } = useLanguage();
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
          conversational_context: `Customer cart: ${items
            .map((item) => `${item.product.name[language]} x${item.quantity} (¥${item.product.price})`)
            .join(", ")}. Total items: ${items.length}.`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start conversation");
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
