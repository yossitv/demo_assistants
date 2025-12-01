"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "../providers/LanguageProvider";
import styles from "./home.module.css";

const halloweenIcons = [
  { src: "/halloween/582a91c2fb2b5b691b31fb9c7cb55da7a016835a.png", style: { top: "12%", right: "3%", width: "180px" } },
  { src: "/halloween/9f22c947bc93d5b155f773e73bd7a35c67637810.png", style: { top: "25%", left: "2%", width: "160px" } },
  { src: "/halloween/dd35ec9d7b06fb5b899dae202642f0c0fd571d56.png", style: { bottom: "25%", right: "2%", width: "140px" } },
  { src: "/halloween/4f576476763671db288511028d311c966a060b4e.png", style: { bottom: "10%", left: "3%", width: "150px" } },
  { src: "/halloween/c34b953113163593e06ba9ba0d9cbb972e8dc60e.png", style: { top: "12%", left: "10%", width: "120px" } },
  { src: "/halloween/7d4225c4f794d7555b1acb3ea812c9291e1bc8c8.png", style: { bottom: "5%", right: "12%", width: "150px" } },
  { src: "/halloween/3a907c0e594e74c8ee10d4f6af21989002f8fa42.png", style: { top: "45%", right: "1%", width: "130px" } },
  { src: "/halloween/2d5bb73a1c62efc4fda8a489001d6af2c1a55638.png", style: { top: "15%", left: "25%", width: "140px" } },
  { src: "/halloween/77a735da49034868d2c87d226185a35067275c8c.png", style: { bottom: "20%", left: "8%", width: "120px" } },
];

export default function HomePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Image src="/3dicons/latte-art.png" alt="" width={40} height={40} className={styles.logoIcon3d} />
          <span className={styles.logoText}>Hearth Coffee</span>
        </div>
        <div className={styles.controls}>
          <button
            className={`${styles.langBtn} ${language === "ja" ? styles.active : ""}`}
            onClick={() => setLanguage("ja")}
          >
            日本語
          </button>
          <button
            className={`${styles.langBtn} ${language === "en" ? styles.active : ""}`}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>
      </header>

      <main className={styles.hero}>
        <div className={styles.heroBackground} />
        
        {/* Halloween Icons floating */}
        <div className={styles.halloweenSection}>
          <div className={styles.halloweenGrid}>
            {halloweenIcons.map((icon, i) => (
              <div key={i} className={styles.halloweenCard} style={icon.style}>
                <Image src={icon.src} alt="" width={150} height={150} className={styles.halloweenIcon} />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroContent}>
          <p className={styles.kicker}>{t("セルフオーダー", "Self-Order Kiosk")}</p>
          <h1 className={styles.title}>{t("タップして注文", "Tap to Order")}</h1>
          <p className={styles.subtitle}>{t("簡単3ステップで、すぐにお届け", "Quick & easy in just 3 steps")}</p>
          <button
            className={`${styles.cta} ${isPressed ? styles.pressed : ""}`}
            onClick={() => router.push("/casher_1/order")}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setTimeout(() => setIsPressed(false), 150)}
            onMouseLeave={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setTimeout(() => setIsPressed(false), 150)}
          >
            {t("注文を開始", "Start Order")}
          </button>
        </div>
      </main>

      <section className={styles.steps}>
        <div className={styles.step}>
          <div className={styles.stepInfo}>
            <Image src="/3dicons/828187bd500ea5e1e384b89cf2d151af850b7d65.png" alt="" width={48} height={48} className={styles.stepIcon3d} />
            <span className={styles.stepLabel}>{t("注文", "Order")}</span>
          </div>
        </div>
        <div className={styles.stepLine} />
        <div className={styles.step}>
          <div className={styles.stepInfo}>
            <Image src="/3dicons/a08b0fcb7d9c1876cc4ee939ebfdfa27993366d3.png" alt="" width={48} height={48} className={styles.stepIcon3d} />
            <span className={styles.stepLabel}>{t("支払い", "Pay")}</span>
          </div>
        </div>
        <div className={styles.stepLine} />
        <div className={styles.step}>
          <div className={styles.stepInfo}>
            <Image src="/3dicons/57aba15c7ee837298544a9be4978d488539683a0.png" alt="" width={48} height={48} className={styles.stepIcon3d} />
            <span className={styles.stepLabel}>{t("受取", "Pick up")}</span>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>{t("お困りの際はスタッフをお呼びください", "Need help? Ask our staff")}</p>
      </footer>
    </div>
  );
}
