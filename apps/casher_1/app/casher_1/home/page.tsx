"use client";
import { useRouter } from "next/navigation";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { useLanguage } from "../providers/LanguageProvider";
import { useTheme } from "../providers/ThemeProvider";
import styles from "../styles.module.css";

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <div className={styles.container} data-theme={theme}>
      <div className={styles.toolbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}></div>
          <div>
            <p className={styles.brandLabel}>
              {theme === "halloween" ? "🎃 Spooky Coffee" : "Hearth Coffee"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      <div className={styles.homeShell}>
        <div className={styles.homeGrid}>
          <div className={`${styles.homeHeroCard} ${styles.card}`}>
            <p style={{ fontSize: "0.875rem", color: "#8D6E63", marginBottom: "0.5rem" }}>
              {t("セルフオーダーカウンター", "Self-order counter")}
            </p>
            <p style={{ fontSize: "1.125rem", color: "#6D4C41", marginBottom: "2rem" }}>
              {t("店内でもテイクアウトでも歓迎です", "Welcome in — take a seat or take out")}
            </p>
            <h1 className={styles.homeTitle}>
              {t("タップしてすぐに注文", "Tap to start your order")}
            </h1>
            <p className={styles.homeSubtitle}>
              {t(
                "日本語・英語に対応。スタッフがキッチンで確認します。",
                "Works in Japanese or English. Our baristas see your order instantly."
              )}
            </p>
            <button
              className={styles.startButton}
              onClick={() => router.push("/casher_1/order")}
            >
              {t("注文を開始", "Start Order")}
            </button>
            <p style={{ fontSize: "0.875rem", color: "#a1887f", marginTop: "1.5rem" }}>
              {t(
                "途中で迷ったらスタッフを呼び出せます。",
                "Need help? Call a barista from the next screen."
              )}
            </p>
          </div>

          <div className={`${styles.homeInfoCard} ${styles.card}`}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem" }}>📝</div>
                <div style={{ fontSize: "0.75rem", color: "#8D6E63" }}>
                  {t("ステップ1: 注文", "Step 1: Choose")}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem" }}>💳</div>
                <div style={{ fontSize: "0.75rem", color: "#8D6E63" }}>
                  {t("ステップ2: 支払い", "Step 2: Pay")}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem" }}>☕</div>
                <div style={{ fontSize: "0.75rem", color: "#8D6E63" }}>
                  {t("ステップ3: 受け取り", "Step 3: Pick up")}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#8D6E63", marginBottom: "0.25rem" }}>
                  {t("平均提供時間", "Avg prep time")}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "700", color: "#4E342E" }}>
                  {t("4-6 分", "4–6 minutes")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#8D6E63", marginBottom: "0.25rem" }}>
                  {t("サポート言語", "Languages")}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "700", color: "#4E342E" }}>
                  {t("日本語 / 英語", "Japanese / English")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#8D6E63", marginBottom: "0.25rem" }}>
                  {t("支払い", "Payments")}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "700", color: "#4E342E" }}>
                  {t("現金・カード・コード決済", "Cash, card, QR")}
                </div>
              </div>
            </div>

            <div>
              <p style={{ fontSize: "0.875rem", color: "#8D6E63", marginBottom: "0.5rem" }}>
                {t("ご案内", "House notes")}
              </p>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "#4E342E", marginBottom: "1rem" }}>
                {t(
                  "落ち着いた操作で、すぐに提供",
                  "Calm, clear ordering for a busy cafe"
                )}
              </h3>
              <p style={{ fontSize: "0.875rem", color: "#6D4C41", lineHeight: "1.6", marginBottom: "1rem" }}>
                {t(
                  "大きなボタンとシンプルな画面で、並んでいても安心です。",
                  "Large touch targets and simple screens keep the line moving."
                )}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={{ padding: "0.5rem 0", fontSize: "0.875rem", color: "#6D4C41" }}>
                  • {t(
                    "数量は後で変更できます。まとめて決済へ進めます。",
                    "You can tweak quantities before paying, all in one place."
                  )}
                </li>
                <li style={{ padding: "0.5rem 0", fontSize: "0.875rem", color: "#6D4C41" }}>
                  • {t(
                    "スタッフに相談できるビデオ呼び出しを常設。",
                    "Video-call a staff member anytime for a recommendation."
                  )}
                </li>
                <li style={{ padding: "0.5rem 0", fontSize: "0.875rem", color: "#6D4C41" }}>
                  • {t(
                    "完了後は3秒でホームに戻り、次のお客様を迎えます。",
                    "After checkout, the kiosk resets in 3 seconds for the next guest."
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
