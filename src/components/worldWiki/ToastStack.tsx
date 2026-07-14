import type { ReactNode } from "react";

import styles from "./ToastStack.module.css";
import type { ToastItem } from "./useToasts";

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export default function ToastStack({ toasts, onDismiss }: ToastStackProps): ReactNode {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.variant === "error" ? styles.toastError : styles.toastSuccess}`}
        >
          <p className={styles.toastText}>{toast.text}</p>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
