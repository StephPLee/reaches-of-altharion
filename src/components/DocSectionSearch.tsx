import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./DocSectionSearch.module.css";

type DocSectionSearchProps = {
  headingSelector?: string;
  nounPlural: string;
  placeholder: string;
  keepVisibleSelector?: string;
};

type Section = {
  heading: HTMLElement;
  contentNodes: HTMLElement[];
  searchText: string;
};

function collectSections(
  article: HTMLElement,
  root: HTMLElement,
  headingSelector: string,
): Section[] {
  const headings = Array.from(
    article.querySelectorAll<HTMLElement>(headingSelector),
  ).filter((heading) => !root.contains(heading));

  return headings.map((heading) => {
    const contentNodes: HTMLElement[] = [];
    let next = heading.nextElementSibling as HTMLElement | null;

    while (next && !next.matches(headingSelector)) {
      if (!root.contains(next)) {
        contentNodes.push(next);
      }
      next = next.nextElementSibling as HTMLElement | null;
    }

    const searchText = [heading, ...contentNodes]
      .map((node) => node.textContent ?? "")
      .join(" ")
      .toLowerCase();

    return { heading, contentNodes, searchText };
  });
}

function shouldKeepVisible(node: HTMLElement, keepVisibleSelector?: string) {
  return Boolean(keepVisibleSelector && node.matches(keepVisibleSelector));
}

export default function DocSectionSearch({
  headingSelector = "h2",
  nounPlural,
  placeholder,
  keepVisibleSelector,
}: DocSectionSearchProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<Section[]>([]);
  const [query, setQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<number, boolean>
  >({});
  const [counts, setCounts] = useState({ visible: 0, total: 0 });
  const inputId = `${nounPlural.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-search`;
  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const article = root.closest("article");

    if (!article) {
      return;
    }

    const sections = collectSections(article, root, headingSelector);
    sectionsRef.current = sections;
    setCounts({ visible: sections.length, total: sections.length });
    setCollapsedSections((prev) => {
      const next: Record<number, boolean> = {};

      sections.forEach((_, index) => {
        next[index] = prev[index] ?? true;
      });

      return next;
    });

    return () => {
      sections.forEach((section) => {
        section.heading.style.display = "";
        section.heading.classList.remove(styles.sectionHeading);
        section.contentNodes.forEach((node) => {
          node.style.display = "";
        });
        section.heading.onclick = null;
      });
    };
  }, [headingSelector]);

  useEffect(() => {
    const sections = sectionsRef.current;
    let visible = 0;

    sections.forEach((section, index) => {
      const matches =
        !normalizedQuery || section.searchText.includes(normalizedQuery);
      const isCollapsed =
        !normalizedQuery && collapsedSections[index] !== false;

      section.heading.style.display = matches ? "" : "none";
      section.heading.classList.add(styles.sectionHeading);
      section.heading.onclick = () => {
        setCollapsedSections((prev) => ({
          ...prev,
          [index]: !(prev[index] ?? true),
        }));
      };

      section.contentNodes.forEach((node) => {
        if (!matches) {
          node.classList.remove("doc-section-kept-collapsed");
          node.style.display = "none";
          return;
        }

        if (isCollapsed && !shouldKeepVisible(node, keepVisibleSelector)) {
          node.classList.remove("doc-section-kept-collapsed");
          node.style.display = "none";
          return;
        }

        if (isCollapsed && shouldKeepVisible(node, keepVisibleSelector)) {
          node.classList.add("doc-section-kept-collapsed");
          if (node.parentElement !== section.heading) {
            section.heading.appendChild(node);
          }
        } else {
          node.classList.remove("doc-section-kept-collapsed");
          if (node.parentElement === section.heading) {
            const nextContentNode =
              section.contentNodes.find(
                (contentNode) => contentNode !== node,
              ) ?? null;

            section.heading.parentElement?.insertBefore(node, nextContentNode);
          }
        }

        node.style.display = "";
      });

      if (matches) {
        visible += 1;
      }
    });

    setCounts({ visible, total: sections.length });
  }, [collapsedSections, keepVisibleSelector, normalizedQuery]);

  return (
    <div ref={rootRef} className={styles.controlsPanel}>
      <div className={styles.controlsRow}>
        <div className={styles.searchField}>
          <label className={styles.searchLabel} htmlFor={inputId}>
            Search {nounPlural}
          </label>
          <input
            id={inputId}
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
        </div>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={() =>
              setCollapsedSections((prev) =>
                Object.fromEntries(
                  Object.keys(prev).map((key) => [Number(key), false]),
                ),
              )
            }
          >
            Expand all
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={() =>
              setCollapsedSections((prev) =>
                Object.fromEntries(
                  Object.keys(prev).map((key) => [Number(key), true]),
                ),
              )
            }
          >
            Collapse all
          </button>
        </div>
      </div>
      <p className={styles.searchHint}>
        Search filters by heading and content. Matching sections open while a
        search is active.
      </p>
      <p className={styles.count}>
        Showing {counts.visible} of {counts.total} {nounPlural}.
      </p>
    </div>
  );
}
