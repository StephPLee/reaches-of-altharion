import { useCallback, useRef, useState } from "react";

export type ToastVariant = "success" | "error";

export type ToastItem = {
  id: number;
  variant: ToastVariant;
  text: string;
};

const TOAST_DURATION_MS = 4500;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, text: string) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setToasts((current) => [...current, { id, variant, text }]);
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast],
  );

  return { toasts, showToast, dismissToast };
}
