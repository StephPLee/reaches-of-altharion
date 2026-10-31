import { FormEvent, useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import { renderMarkdownBlock } from "./FaqDirectory";
import faqStyles from "./FaqDirectory.module.css";
import styles from "./ErrataDirectory.module.css";

type Errata = {
  id: number;
  title: string;
  content: string;
};

type ErrataDraft = {
  title: string;
  content: string;
};

type SessionUser = {
  username: string;
  globalName: string | null;
  isStaff: boolean;
};

const EMPTY_DRAFT: ErrataDraft = { title: "", content: "" };

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function matchesSearch(errata: Errata, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }

  const haystack = `${errata.title}\n${errata.content}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export default function ErrataDirectory() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [errataList, setErrataList] = useState<Errata[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // null = no editor open, "new" = adding an errata, number = editing that id.
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<ErrataDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isStaff = Boolean(currentUser?.isStaff);
  const filteredErrata = useMemo(
    () => errataList.filter((errata) => matchesSearch(errata, searchQuery)),
    [errataList, searchQuery],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadErrata() {
      try {
        setLoading(true);
        const response = await fetch(`${authApiBaseUrl}/api/errata`);
        if (!response.ok) {
          throw new Error(`Failed to load errata (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setErrataList(Array.isArray(payload.errata) ? payload.errata : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load errata.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadErrata();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!cancelled) {
          setCurrentUser(payload.authenticated ? payload.user : null);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  function openEditor(target: Errata | "new") {
    setEditingId(target === "new" ? "new" : target.id);
    setDraft(
      target === "new"
        ? EMPTY_DRAFT
        : { title: target.title, content: target.content },
    );
    setError("");
    setMessage("");
  }

  function closeEditor() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId === null) {
      return;
    }

    const isNew = editingId === "new";
    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        isNew
          ? `${authApiBaseUrl}/api/admin/errata`
          : `${authApiBaseUrl}/api/admin/errata/${editingId}`,
        {
          method: isNew ? "POST" : "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save errata.");
      }

      const saved: Errata = payload.errata;
      setErrataList((current) =>
        isNew
          ? [...current, saved]
          : current.map((errata) => (errata.id === saved.id ? saved : errata)),
      );
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      setMessage(isNew ? "Errata added." : "Errata updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save errata.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(errata: Errata) {
    if (!window.confirm(`Delete the errata "${errata.title}"?`)) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/errata/${errata.id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete errata.");
      }

      setErrataList((current) =>
        current.filter((entry) => entry.id !== errata.id),
      );
      if (editingId === errata.id) {
        closeEditor();
      }
      setMessage("Errata deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete errata.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderEditor() {
    return (
      <form className={faqStyles.editorPanel} onSubmit={handleSubmit}>
        <label className={faqStyles.field}>
          <span className={faqStyles.fieldLabel}>Title</span>
          <input
            className={faqStyles.input}
            value={draft.title}
            placeholder="e.g. Crossbow Expert (Feat)"
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>
        <label className={faqStyles.field}>
          <span className={faqStyles.fieldLabel}>Ruling</span>
          <textarea
            className={faqStyles.textarea}
            value={draft.content}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
          />
        </label>
        {editingId === "new" ? (
          <p className={styles.hint}>
            New errata are also posted to the Discord errata list.
          </p>
        ) : null}
        <div className={faqStyles.formActions}>
          <button
            className={faqStyles.secondaryButton}
            type="button"
            onClick={closeEditor}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className={faqStyles.primaryButton}
            type="submit"
            disabled={isSaving}
          >
            {isSaving
              ? "Saving..."
              : editingId === "new"
                ? "Add Errata"
                : "Save Errata"}
          </button>
        </div>
      </form>
    );
  }

  function renderErrata(errata: Errata) {
    if (editingId === errata.id) {
      return (
        <article className={faqStyles.entry} key={errata.id}>
          {renderEditor()}
        </article>
      );
    }

    return (
      <article className={faqStyles.entry} key={errata.id}>
        <div className={styles.entryHeader}>
          <h3 className={faqStyles.entryTitle}>{errata.title}</h3>
          {isStaff ? (
            <div className={styles.entryActions}>
              <button
                className={faqStyles.secondaryButton}
                type="button"
                onClick={() => openEditor(errata)}
                disabled={isSaving}
              >
                Edit
              </button>
              <button
                className={faqStyles.secondaryButton}
                type="button"
                onClick={() => handleDelete(errata)}
                disabled={isSaving}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
        <div className={faqStyles.answer}>
          {renderMarkdownBlock(errata.content)}
        </div>
      </article>
    );
  }

  return (
    <section className={faqStyles.shell}>
      {isStaff ? (
        <div className={faqStyles.controlsPanel}>
          <div className={faqStyles.controlsRow}>
            <span>Signed in with errata editing access</span>
            <button
              className={faqStyles.controlButton}
              type="button"
              onClick={() => openEditor("new")}
              disabled={isSaving || editingId === "new"}
            >
              Add Errata
            </button>
          </div>
          {message ? <p className={faqStyles.message}>{message}</p> : null}
          {error ? <p className={faqStyles.error}>{error}</p> : null}
        </div>
      ) : null}

      {editingId === "new" ? renderEditor() : null}

      <label className={faqStyles.field}>
        <span className={faqStyles.fieldLabel}>Search errata</span>
        <input
          className={faqStyles.input}
          type="search"
          value={searchQuery}
          placeholder="Search by feat, spell, class, item..."
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>

      {loading ? <p>Loading errata...</p> : null}
      {!isStaff && error ? <p className={faqStyles.error}>{error}</p> : null}

      {!loading ? (
        <section className={faqStyles.category}>
          <p className={styles.resultCount}>
            {searchQuery.trim()
              ? `Showing ${filteredErrata.length} of ${errataList.length} errata`
              : `${errataList.length} errata`}
          </p>
          {filteredErrata.length > 0 ? (
            filteredErrata.map(renderErrata)
          ) : (
            <p className={styles.empty}>
              {errataList.length === 0
                ? "No errata have been added yet."
                : "No errata match your search."}
            </p>
          )}
        </section>
      ) : null}
    </section>
  );
}
