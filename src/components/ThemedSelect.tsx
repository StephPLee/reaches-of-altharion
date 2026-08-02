import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "./ThemedSelect.module.css";

export type ThemedSelectOption = {
  value: string;
  label: string;
};

type ThemedSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
};

export default function ThemedSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
}: ThemedSelectProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [panelRect, setPanelRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsidePanel = panelRef.current?.contains(target);
      if (!isInsideTrigger && !isInsidePanel) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function updatePosition() {
      if (!triggerRef.current) {
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelRect({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={styles.selectCombo}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={styles.selectTrigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPanelRect({
              top: rect.bottom + 6,
              left: rect.left,
              width: rect.width,
            });
          }
          setIsOpen((open) => !open);
        }}
      >
        <span
          className={
            selectedOption
              ? styles.selectTriggerValue
              : styles.selectTriggerPlaceholder
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={styles.selectChevron} aria-hidden="true" />
      </button>
      {isOpen && panelRect
        ? createPortal(
            <div
              ref={panelRef}
              className={styles.selectPanel}
              role="listbox"
              style={{
                top: panelRect.top,
                left: panelRect.left,
                width: panelRect.width,
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`${styles.selectOption} ${
                    option.value === value ? styles.selectOptionActive : ""
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
