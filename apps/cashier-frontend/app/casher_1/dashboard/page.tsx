"use client";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.bgOverlay} />
      
      <div className={styles.folderDecor}>
        <span style={{fontSize: '200px'}}>☕</span>
      </div>

      <div className={styles.screen}>
        <div className={styles.glassLayer1} />
        <div className={styles.glassLayer2} />
        
        <div className={styles.mainContent}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.logo}>
              <span>☕</span>
              <span>Coffee House</span>
            </div>
            
            <nav className={styles.nav}>
              <a className={`${styles.navItem} ${styles.active}`}>
                <span className={styles.navIcon}>🏠</span>
                <span>ホーム</span>
              </a>
              <a className={styles.navItem}>
                <span className={styles.navIcon}>☕</span>
                <span>メニュー</span>
              </a>
              <a className={styles.navItem}>
                <span className={styles.navIcon}>🛒</span>
                <span>注文管理</span>
              </a>
              <a className={styles.navItem}>
                <span className={styles.navIcon}>📅</span>
                <span>予約</span>
              </a>
              <div className={styles.navDivider} />
              <a className={styles.navItem}>
                <span className={styles.navIcon}>⚙️</span>
                <span>設定</span>
              </a>
              <a className={styles.navItem}>
                <span className={styles.navIcon}>🚪</span>
                <span>ログアウト</span>
              </a>
            </nav>

            <div className={styles.upgradeCard}>
              <div className={styles.upgradeContent}>
                <p className={styles.upgradeTitle}>会員登録</p>
                <p className={styles.upgradeDesc}>ポイントを貯めてお得に！</p>
                <button className={styles.upgradeBtn}>登録する</button>
              </div>
            </div>
          </aside>

          {/* Header */}
          <header className={styles.header}>
            <div className={styles.searchBox}>
              <span>🔍</span>
              <span>メニューを検索...</span>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.iconBtn}>🛒</button>
              <button className={styles.iconBtn}>🔔</button>
            </div>
          </header>

          {/* Content area */}
          <main className={styles.content}>
            {/* Menu Cards */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>人気メニュー</h2>
                <div className={styles.arrows}>
                  <button>←</button>
                  <button>→</button>
                </div>
              </div>
              <div className={styles.cardGrid}>
                <div className={styles.card}>
                  <div className={styles.cardEmoji}>☕</div>
                  <button className={styles.heartBtn}>♡</button>
                  <p className={styles.cardTitle}>カフェラテ</p>
                  <p className={styles.cardPrice}>¥480</p>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardEmoji}>🧋</div>
                  <button className={styles.heartBtn}>♡</button>
                  <p className={styles.cardTitle}>キャラメルマキアート</p>
                  <p className={styles.cardPrice}>¥520</p>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardEmoji}>🍵</div>
                  <button className={styles.heartBtn}>♡</button>
                  <p className={styles.cardTitle}>抹茶ラテ</p>
                  <p className={styles.cardPrice}>¥500</p>
                </div>
              </div>
            </section>

            {/* Statistics */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>売上統計</h2>
                <div className={styles.yearNav}>
                  <button>←</button>
                  <span>2024</span>
                  <button>→</button>
                </div>
              </div>
              <div className={styles.statsCard}>
                <div className={styles.tooltip}>
                  <span className={styles.tooltipValue}>¥125K</span>
                  <span className={styles.tooltipLabel}>今月</span>
                </div>
                <div className={styles.chartArea}>
                  <div className={styles.chartLine} />
                </div>
                <div className={styles.months}>
                  {['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'].map(m => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </section>
          </main>

          {/* Right sidebar */}
          <aside className={styles.rightSidebar}>
            <div className={styles.profileCard}>
              <div className={styles.avatarEmoji}>🏪</div>
              <p className={styles.profileName}>Coffee House 渋谷店</p>
              <p className={styles.profileEmail}>shibuya@coffeehouse.jp</p>
              <div className={styles.profileStats}>
                <div>
                  <span className={styles.statLabel}>本日の注文</span>
                  <span className={styles.statValue}>48</span>
                </div>
                <div>
                  <span className={styles.statLabel}>予約</span>
                  <span className={styles.statValue}>5</span>
                </div>
              </div>
            </div>

            <h3 className={styles.quickStartTitle}>最近の注文</h3>
            <div className={styles.quickStartList}>
              <div className={styles.quickStartItem}>
                <div className={styles.quickStartEmoji}>☕</div>
                <div>
                  <p className={styles.quickStartName}>カフェラテ x2</p>
                  <p className={styles.quickStartTime}>3分前</p>
                </div>
              </div>
              <div className={styles.quickStartItem}>
                <div className={styles.quickStartEmoji}>🥐</div>
                <div>
                  <p className={styles.quickStartName}>クロワッサン</p>
                  <p className={styles.quickStartTime}>8分前</p>
                </div>
              </div>
              <div className={styles.quickStartItem}>
                <div className={styles.quickStartEmoji}>🧋</div>
                <div>
                  <p className={styles.quickStartName}>アイスモカ</p>
                  <p className={styles.quickStartTime}>12分前</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
