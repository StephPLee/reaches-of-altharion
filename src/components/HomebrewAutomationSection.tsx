import type { ReactNode } from "react";

import styles from "./HomebrewAutomationSection.module.css";

type HomebrewAutomationSectionProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
};

export default function HomebrewAutomationSection({
  children,
  title = "Avrae Automation",
  subtitle = "Expand to view setup and download options",
  defaultOpen = false,
}: HomebrewAutomationSectionProps) {
  return (
    <div className={styles.wrapper}>
      <details className={styles.section} open={defaultOpen}>
        <summary className={styles.summary}>
          <span className={styles.toggle} aria-hidden="true">
            &gt;
          </span>
          <span className={styles.meta}>
            <span className={styles.title}>{title}</span>
            <span className={styles.subtitle}>{subtitle}</span>
          </span>
        </summary>
        <div className={styles.body}>{children}</div>
      </details>
    </div>
  );
}
