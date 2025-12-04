"use client";

import { useFlow } from "../providers/FlowProvider";
import { useLanguage } from "../providers/LanguageProvider";
import styles from "../styles.module.css";

export function CancelButton() {
  const { goToPrevious } = useFlow();
  const { t } = useLanguage();

  return (
    <button className={styles.buttonSecondary} onClick={goToPrevious}>
      {t("戻る", "Back")}
    </button>
  );
}
