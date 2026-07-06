import type { ReactNode } from "react";
import styles from "./PageLoader.module.css";

export default function PageLoader({
  label = "Loading",
}: {
  label?: string;
}): ReactNode {
  return (
    <div className={styles.wrap} role="status" aria-label={label}>
      <div className={styles.stack}>
        <div className={styles.ring} aria-hidden="true" />
        <img
          className={styles.logo}
          src="/img/A%20logo%20gold.png"
          alt=""
        />
      </div>
    </div>
  );
}
