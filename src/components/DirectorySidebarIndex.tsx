import { useEffect, useRef } from "react";
import styles from "./DirectorySidebarIndex.module.css";

type DirectorySidebarIndexItem = {
  id: string;
  label: string;
};

type DirectorySidebarIndexProps = {
  title?: string;
  items: DirectorySidebarIndexItem[];
};

export default function DirectorySidebarIndex({
  title = "",
  items,
}: DirectorySidebarIndexProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current?.closest(".theme-doc-markdown") as HTMLElement | null;
    if (!el) return;
    el.classList.add("has-directory-index");
    return () => el.classList.remove("has-directory-index");
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <aside ref={ref} className={styles.sidebar}>
      <div className={styles.panel}>
        {title ? <p className={styles.title}>{title}</p> : null}
        <nav aria-label={title}>
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <a className={styles.link} href={`#${item.id}`}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
