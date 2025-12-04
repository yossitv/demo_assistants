"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { AvatarState, Language } from "../types";
import { useTavusMode } from "./TavusModeProvider";
import SharedAvatarIframe from "../components/SharedAvatarIframe";
import styles from "../styles.module.css";
import { createPortal } from "react-dom";
import { DebugBadge } from "../components/DebugBadge";

const MAX_RETRIES = 3;
const AUTO_DISCONNECT_MS = 10 * 60 * 1000; // 10 minutes

interface AvatarContextValue {
  state: AvatarState;
  expand: () => void;
  collapse: () => void;
  connect: (language: Language, cartContext: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const initialState: AvatarState = {
  isExpanded: false,
  isConnected: false,
  isConnecting: false,
  conversationUrl: null,
  conversationId: null,
  error: null,
};

const AvatarStateContext = createContext<AvatarContextValue | undefined>(undefined);

export function AvatarStateProvider({
  children,
  initialState: initialStateOverride,
}: {
  children: ReactNode;
  initialState?: AvatarState;
}) {
  const [state, setState] = useState<AvatarState>(initialStateOverride ?? initialState);
  const retryCount = useRef(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastConnectParams = useRef<{ language: Language; cartContext: string } | null>(null);
  const iframeRootRef = useRef<HTMLElement | null>(null);
  const { mode, config, isValid } = useTavusMode();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.getElementById("shared-avatar-iframe-root");
    if (existing) {
      iframeRootRef.current = existing;
      return;
    }
    const el = document.createElement("div");
    el.id = "shared-avatar-iframe-root";
    document.body.appendChild(el);
    iframeRootRef.current = el;
    return () => {
      if (document.body.contains(el)) {
        document.body.removeChild(el);
      }
    };
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }, []);

  const disconnect = useCallback(async () => {
    const { conversationId } = state;
    clearInactivityTimer();
    if (conversationId) {
      console.info("[Tavus] disconnect requested", conversationId);
      try {
        await fetch(`/api/conversations/${conversationId}/end`, {
          method: "POST",
        });
        console.info("[Tavus] disconnect API succeeded", conversationId);
      } catch (error) {
        console.error("Failed to end conversation:", error);
      }
    }
    setState(initialStateOverride ?? initialState);
  }, [state, clearInactivityTimer, initialStateOverride]);

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimer.current = setTimeout(() => {
      disconnect();
    }, AUTO_DISCONNECT_MS);
  }, [clearInactivityTimer, disconnect]);

  const expand = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: true }));
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const collapse = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: false }));
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const connect = useCallback(
    async (language: Language, cartContext: string) => {
      lastConnectParams.current = { language, cartContext };

      if (!isValid) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: "設定不足で接続できません",
        }));
        console.warn(`[Tavus] Missing config for mode: ${mode}`);
        return;
      }

      setState((prev) => ({ ...prev, isConnecting: true, error: null }));

      const attemptConnect = async (): Promise<void> => {
        try {
          const response = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: language === "ja" ? "japanese" : "english",
              conversational_context: cartContext,
              replica_id: config.replicaId,
              persona_id: config.personaId,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error ?? "Failed to start conversation");
          }

          if (data.conversation_url && data.conversation_id) {
            retryCount.current = 0;
            setState((prev) => ({
              ...prev,
              isConnecting: false,
              isConnected: true,
              isExpanded: true,
              conversationUrl: data.conversation_url,
              conversationId: data.conversation_id,
            }));
            console.info("[Tavus] connected", data.conversation_id, { mode });
            resetInactivityTimer();
          } else {
            throw new Error("No conversation_url in response");
          }
        } catch (error) {
          if (retryCount.current < MAX_RETRIES - 1) {
            retryCount.current++;
            await new Promise((r) => setTimeout(r, 1000));
            return attemptConnect();
          }
          retryCount.current = 0;
          setState((prev) => ({
            ...prev,
            isConnecting: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }));
        }
      };

      await attemptConnect();
    },
    [resetInactivityTimer, isValid, mode, config.replicaId, config.personaId],
  );

  useEffect(() => {
    if (!state.isConnected) {
      clearInactivityTimer();
      return () => clearInactivityTimer();
    }
    resetInactivityTimer();
    return () => clearInactivityTimer();
  }, [state.isConnected, resetInactivityTimer, clearInactivityTimer]);

  useEffect(() => {
    const handlePageHide = () => {
      if (state.isConnected) {
        disconnect();
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [state.isConnected, disconnect]);

  useEffect(() => {
    const logAllMessages = process.env.NODE_ENV !== "production";

    const handleMessage = (event: MessageEvent) => {
      if (logAllMessages) {
        console.info("[postMessage][debug]", {
          origin: event.origin,
          data: event.data,
        });
      }

      const payload = event.data;
      const fromTavusOrigin =
        typeof event.origin === "string" && event.origin.toLowerCase().includes("tavus");
      const looksLikeTavusPayload =
        payload && typeof payload === "object" && ("tavusEvent" in payload || "conversation_id" in payload);

      if (!fromTavusOrigin && !looksLikeTavusPayload) return;

      console.info("[Tavus] postMessage received", {
        origin: event.origin,
        data: payload,
      });

      if (
        payload &&
        typeof payload === "object" &&
        ("tavusEvent" in payload || "status" in payload)
      ) {
        const tavusEvent = (payload as Record<string, unknown>).tavusEvent;
        const status = (payload as Record<string, unknown>).status;
        if (tavusEvent === "conversationEnded" || status === "ended") {
          disconnect();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [disconnect]);

  useEffect(() => {
    if (!lastConnectParams.current) {
      return;
    }
    if (!state.isConnected && !state.isConnecting) {
      return;
    }
    const params = lastConnectParams.current;

    const reconnect = async () => {
      await disconnect();
      if (!params) return;
      if (!isValid) {
        setState((prev) => ({
          ...prev,
          error: "設定不足で接続できません",
          isConnecting: false,
          isConnected: false,
        }));
        return;
      }
      await connect(params.language, params.cartContext);
    };

    reconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const shouldShowIframe = Boolean(state.conversationUrl);
  const iframeWrapperClass = [
    styles.sharedAvatarWrapper,
    state.isExpanded ? styles.sharedAvatarExpanded : styles.sharedAvatarFloating,
    shouldShowIframe && state.isConnected ? "" : styles.sharedAvatarHidden,
  ]
    .filter(Boolean)
    .join(" ");

  const iframeNode =
    iframeRootRef.current && shouldShowIframe
      ? createPortal(
          <div
            className={iframeWrapperClass}
            onClick={() => {
              if (!state.isExpanded) {
                expand();
              }
            }}
          >
            {state.isExpanded && (
              <div className={styles.sharedAvatarChrome}>
                <button className={styles.closeButton} onClick={collapse}>
                  ×
                </button>
                <DebugBadge
                  mode={mode}
                  config={config}
                  conversationId={state.conversationId}
                  isConnected={state.isConnected}
                />
                <button
                  className={styles.endSessionButton}
                  onClick={() => {
                    void disconnect();
                  }}
                >
                  End Tavus
                </button>
              </div>
            )}
            <SharedAvatarIframe conversationUrl={state.conversationUrl!} />
          </div>,
          iframeRootRef.current,
        )
      : null;

  return (
    <AvatarStateContext.Provider value={{ state, expand, collapse, connect, disconnect }}>
      {children}
      {iframeNode}
    </AvatarStateContext.Provider>
  );
}

export function useAvatarState() {
  const context = useContext(AvatarStateContext);
  if (!context) {
    throw new Error("useAvatarState must be used within AvatarStateProvider");
  }
  return context;
}
