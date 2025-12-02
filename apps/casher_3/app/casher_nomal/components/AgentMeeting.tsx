"use client";

import { useState, useEffect, useRef } from "react";
import { useCart } from "../providers/CartProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { useConversation } from "../providers/ConversationProvider";
import SharedAvatarIframe from "../../components/SharedAvatarIframe";
import styles from "../styles.module.css";

const AUTO_START = process.env.NEXT_PUBLIC_TAVUS_AUTO_START === "true";
const AUTO_COLLAPSE_MS = 5000;

export function AgentMeeting() {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { items } = useCart();
  const { language, t } = useLanguage();
  const { setConversationId } = useConversation();
  const hasStarted = useRef(false);
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (AUTO_START && !hasStarted.current) {
      hasStarted.current = true;
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
        setIsConnected(true);
        setIsExpanded(true);
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

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  const handleEndSession = async () => {
    try {
      await fetch("/api/conversations/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: null }),
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
    <div className={styles.agentCardNomal}>
      <div className={styles.agentInlineHeader}>
        <p className={styles.agentInlineText}>
          {t("接続中: ビデオをタップで拡大できます。", "Connected: tap the video to expand.")}
        </p>
        {!isExpanded && (
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

      {isConnected && isExpanded && (
        <div className={styles.agentOverlay} onClick={handleCollapse} aria-label="Collapse staff call" />
      )}
    </div>
  );
}
