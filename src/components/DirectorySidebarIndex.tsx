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
  if (!items.length) {
    return null;
  }

  return (
    <aside className={styles.sidebar}>
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
