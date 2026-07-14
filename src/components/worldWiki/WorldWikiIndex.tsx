import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import PageLoader from "../PageLoader";
import ToastStack from "./ToastStack";
import { useToasts } from "./useToasts";
import styles from "./WorldWiki.module.css";
import {
  getAuthApiBaseUrl,
  type SessionUser,
  type WorldWikiCategory,
  type WorldWikiPage,
} from "./types";

export default function WorldWikiIndex(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);

  const [pages, setPages] = useState<WorldWikiPage[]>([]);
  const [categories, setCategories] = useState<WorldWikiCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { toasts, showToast, dismissToast } = useToasts();

  async function loadData() {
    const [pagesResponse, categoriesResponse] = await Promise.all([
      fetch(`${authApiBaseUrl}/api/world-wiki/pages`, { credentials: "include" }),
      fetch(`${authApiBaseUrl}/api/world-wiki/categories`),
    ]);
    const pagesPayload = await pagesResponse.json().catch(() => ({}));
    const categoriesPayload = await categoriesResponse.json().catch(() => ({}));
    setPages(Array.isArray(pagesPayload.pages) ? pagesPayload.pages : []);
    setCategories(
      Array.isArray(categoriesPayload.categories) ? categoriesPayload.categories : [],
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const sessionResponse = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });
        const sessionPayload = await sessionResponse.json().catch(() => ({}));
        if (!cancelled) {
          setCurrentUser(sessionPayload.authenticated ? sessionPayload.user : null);
        }
        await loadData();
      } catch {
        // Leave defaults on failure.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authApiBaseUrl]);

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pages.filter((page) => {
      const matchesSearch = !query || page.title.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategoryId === "all" ||
        (selectedCategoryId === "uncategorized" && !page.category) ||
        String(page.category?.id) === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [pages, search, selectedCategoryId]);

  const groupedPages = useMemo(() => {
    const groups = new Map<string, { heading: string; pages: WorldWikiPage[] }>();

    for (const category of categories) {
      groups.set(String(category.id), { heading: category.name, pages: [] });
    }
    groups.set("uncategorized", { heading: "Uncategorized", pages: [] });

    for (const page of filteredPages) {
      const key = page.category ? String(page.category.id) : "uncategorized";
      if (!groups.has(key)) {
        groups.set(key, { heading: page.category?.name || "Uncategorized", pages: [] });
      }
      groups.get(key).pages.push(page);
    }

    return [...groups.values()].filter((group) => group.pages.length > 0);
  }, [categories, filteredPages]);

  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      return;
    }

    try {
      const response = await fetch(`${authApiBaseUrl}/api/admin/world-wiki/categories`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create category.");
      }
      setNewCategoryName("");
      await loadData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to create category.");
    }
  }

  async function handleDeleteCategory(categoryId: number) {
    if (!window.confirm("Delete this category? Pages in it become uncategorized.")) {
      return;
    }

    try {
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/world-wiki/categories/${categoryId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete category.");
      }
      await loadData();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to delete category.");
    }
  }

  if (isLoading) {
    return <PageLoader label="Loading World Wiki" />;
  }

  return (
    <div className={styles.page}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className={styles.panel}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>World Wiki</h1>
        <p className={styles.heroSubtitle}>
          Lore, locations, and factions of Altharion.
        </p>
      </header>

      <div className={styles.toolbarRow}>
        <input
          className={styles.searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title"
          aria-label="Search wiki pages"
        />
        <select
          className={styles.categorySelect}
          value={selectedCategoryId}
          onChange={(event) => setSelectedCategoryId(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
          <option value="uncategorized">Uncategorized</option>
        </select>
        <div className={styles.spacer} />
        {currentUser?.isStaff ? (
          <>
            <button
              type="button"
              className={styles.button}
              onClick={() => setIsManagingCategories((current) => !current)}
            >
              {isManagingCategories ? "Close Categories" : "Manage Categories"}
            </button>
            <Link to="/world-wiki?new=1" className={`${styles.button} ${styles.buttonPrimary}`}>
              New Page
            </Link>
          </>
        ) : null}
      </div>

      {isManagingCategories && currentUser?.isStaff ? (
        <div className={styles.categoryManager}>
          <div className={styles.categoryManagerRow}>
            {categories.map((category) => (
              <span key={category.id} className={styles.categoryChip}>
                {category.name}
                <button
                  type="button"
                  className={styles.categoryChipRemove}
                  onClick={() => handleDeleteCategory(category.id)}
                  aria-label={`Delete category ${category.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className={styles.categoryManagerRow} style={{ marginTop: "0.75rem" }}>
            <input
              className={styles.searchInput}
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="New category name"
            />
            <button type="button" className={styles.button} onClick={handleAddCategory}>
              Add
            </button>
          </div>
        </div>
      ) : null}

      {groupedPages.length === 0 ? (
        <div className={styles.emptyState}>No wiki pages match your search yet.</div>
      ) : null}

      {groupedPages.map((group) => (
        <section key={group.heading} className={styles.categoryGroup}>
          <h2 className={styles.categoryHeading}>{group.heading}</h2>
          <div className={styles.pageGrid}>
            {group.pages.map((page) => (
              <Link
                key={page.slug}
                to={`/world-wiki?slug=${encodeURIComponent(page.slug)}`}
                className={styles.pageCard}
              >
                <p className={styles.pageCardTitle}>{page.title}</p>
                {page.isDraft || page.gmOnly ? (
                  <span className={styles.badgeRow}>
                    {page.isDraft ? <span className={`${styles.badge} ${styles.badgeDraft}`}>Draft</span> : null}
                    {page.gmOnly ? <span className={`${styles.badge} ${styles.badgeGmOnly}`}>GM Only</span> : null}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ))}
      </div>
    </div>
  );
}
