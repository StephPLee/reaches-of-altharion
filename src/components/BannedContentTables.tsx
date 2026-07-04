import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./SourcebooksTables.module.css";

type SourcebookRow = {
  id?: number;
  listType?: "allowed" | "not_allowed";
  title: string;
  publisher: string;
  type: string;
  edition: string;
  sortOrder?: number;
  bannedContentCount?: number;
};

type BannedContentEntry = {
  id?: number;
  sourcebookId: number;
  sourcebookTitle: string;
  sourcebookPublisher: string;
  sourcebookEdition: string;
  contentType: string;
  title: string;
  notes: string;
  sortOrder?: number;
};

type BannedContentGroup = {
  sourcebookId: number;
  sourcebookTitle: string;
  sourcebookPublisher: string;
  sourcebookEdition: string;
  entries: BannedContentEntry[];
};

type SessionUser = {
  isStaff: boolean;
};

type BookFormState = {
  title: string;
  publisher: string;
  type: string;
  edition: string;
  sortOrder: string;
};

type ContentFormState = {
  sourcebookId: string;
  contentType: string;
  title: string;
  notes: string;
  sortOrder: string;
};

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function createEmptyBookForm(): BookFormState {
  return {
    title: "",
    publisher: "",
    type: "",
    edition: "",
    sortOrder: "0",
  };
}

function createEmptyContentForm(sourcebookId = ""): ContentFormState {
  return {
    sourcebookId,
    contentType: "",
    title: "",
    notes: "",
    sortOrder: "0",
  };
}

function slugForBook(sourcebookId: number) {
  return `book-${sourcebookId}`;
}

function matchesSearch(value: string, query: string) {
  return !query || value.toLowerCase().includes(query);
}

export default function BannedContentTables() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [search, setSearch] = useState("");
  const [sourcebooks, setSourcebooks] = useState<SourcebookRow[]>([]);
  const [bannedBooks, setBannedBooks] = useState<SourcebookRow[]>([]);
  const [groups, setGroups] = useState<BannedContentGroup[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookFormOpen, setBookFormOpen] = useState(false);
  const [contentFormOpen, setContentFormOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [deletingBookId, setDeletingBookId] = useState<number | null>(null);
  const [deletingContentId, setDeletingContentId] = useState<number | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bookForm, setBookForm] = useState<BookFormState>(
    createEmptyBookForm(),
  );
  const [contentForm, setContentForm] = useState<ContentFormState>(
    createEmptyContentForm(),
  );
  const isStaff = Boolean(currentUser?.isStaff);
  const normalizedSearch = search.trim().toLowerCase();

  async function refreshBannedContent(useAdminEndpoint = isStaff) {
    const response = await fetch(
      `${authApiBaseUrl}${useAdminEndpoint ? "/api/admin/banned-content" : "/api/banned-content"}`,
      useAdminEndpoint ? { credentials: "include" } : undefined,
    );

    if (!response.ok) {
      throw new Error(`Failed to load banned content (${response.status}).`);
    }

    const payload = await response.json();
    setSourcebooks(
      Array.isArray(payload.sourcebooks) ? payload.sourcebooks : [],
    );
    setBannedBooks(
      Array.isArray(payload.bannedBooks) ? payload.bannedBooks : [],
    );
    setGroups(Array.isArray(payload.groups) ? payload.groups : []);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBannedContent() {
      try {
        setLoading(true);
        const response = await fetch(`${authApiBaseUrl}/api/banned-content`);

        if (!response.ok) {
          throw new Error(
            `Failed to load banned content (${response.status}).`,
          );
        }

        const payload = await response.json();

        if (!cancelled) {
          setBannedBooks(
            Array.isArray(payload.bannedBooks) ? payload.bannedBooks : [],
          );
          setGroups(Array.isArray(payload.groups) ? payload.groups : []);
        }
      } catch {
        if (!cancelled) {
          setBannedBooks([]);
          setGroups([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBannedContent();

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

        if (response.status === 401) {
          if (!cancelled) {
            setCurrentUser(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load auth session (${response.status}).`);
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

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    refreshBannedContent(true).catch(() => undefined);
  }, [authApiBaseUrl, isStaff]);

  const filteredBannedBooks = useMemo(
    () =>
      bannedBooks.filter((book) =>
        matchesSearch(
          `${book.title} ${book.publisher} ${book.type} ${book.edition}`,
          normalizedSearch,
        ),
      ),
    [bannedBooks, normalizedSearch],
  );

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          entries: group.entries.filter((entry) =>
            matchesSearch(
              `${group.sourcebookTitle} ${entry.contentType} ${entry.title} ${entry.notes}`,
              normalizedSearch,
            ),
          ),
        }))
        .filter((group) => {
          if (group.entries.length > 0) {
            return true;
          }

          return matchesSearch(
            `${group.sourcebookTitle} ${group.sourcebookPublisher} ${group.sourcebookEdition}`,
            normalizedSearch,
          );
        }),
    [groups, normalizedSearch],
  );

  const selectableSourcebooks = useMemo(
    () =>
      sourcebooks.length > 0
        ? sourcebooks
        : [
            ...bannedBooks,
            ...groups.map((group) => ({
              id: group.sourcebookId,
              title: group.sourcebookTitle,
              publisher: group.sourcebookPublisher,
              type: "",
              edition: group.sourcebookEdition,
            })),
          ],
    [bannedBooks, groups, sourcebooks],
  );

  function updateBookForm(field: keyof BookFormState, value: string) {
    setBookForm((current) => ({ ...current, [field]: value }));
  }

  function updateContentForm(field: keyof ContentFormState, value: string) {
    setContentForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateBookForm() {
    setBookFormOpen(true);
    setEditingBookId(null);
    setBookForm(createEmptyBookForm());
    setMessage("");
    setError("");
  }

  function openCreateContentForm(sourcebookId = "") {
    setContentFormOpen(true);
    setEditingContentId(null);
    setContentForm(createEmptyContentForm(sourcebookId));
    setMessage("");
    setError("");
  }

  function beginEditingBook(book: SourcebookRow) {
    if (!book.id) {
      return;
    }

    setBookFormOpen(true);
    setEditingBookId(book.id);
    setBookForm({
      title: book.title,
      publisher: book.publisher,
      type: book.type,
      edition: book.edition,
      sortOrder: String(book.sortOrder ?? 0),
    });
    setMessage("");
    setError("");
  }

  function beginEditingContent(entry: BannedContentEntry) {
    if (!entry.id) {
      return;
    }

    setContentFormOpen(true);
    setEditingContentId(entry.id);
    setContentForm({
      sourcebookId: String(entry.sourcebookId),
      contentType: entry.contentType,
      title: entry.title,
      notes: entry.notes,
      sortOrder: String(entry.sortOrder ?? 0),
    });
    setMessage("");
    setError("");
  }

  async function handleBookSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!bookForm.title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isEditing = editingBookId !== null;
      const response = await fetch(
        isEditing
          ? `${authApiBaseUrl}/api/admin/sourcebooks/${editingBookId}`
          : `${authApiBaseUrl}/api/admin/sourcebooks`,
        {
          method: isEditing ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listType: "not_allowed",
            title: bookForm.title.trim(),
            publisher: bookForm.publisher.trim(),
            type: bookForm.type.trim(),
            edition: bookForm.edition.trim(),
            sortOrder: Number.parseInt(bookForm.sortOrder, 10) || 0,
            isPublished: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save banned book.");
      }

      await refreshBannedContent(true);
      setMessage(isEditing ? "Banned book updated." : "Banned book added.");
      setEditingBookId(null);
      setBookForm(createEmptyBookForm());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save banned book.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const sourcebookId = Number.parseInt(contentForm.sourcebookId, 10);
    if (!Number.isInteger(sourcebookId) || sourcebookId <= 0) {
      setError("Sourcebook is required.");
      return;
    }

    if (!contentForm.title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isEditing = editingContentId !== null;
      const response = await fetch(
        isEditing
          ? `${authApiBaseUrl}/api/admin/banned-content/items/${editingContentId}`
          : `${authApiBaseUrl}/api/admin/banned-content/items`,
        {
          method: isEditing ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourcebookId,
            contentType: contentForm.contentType.trim(),
            title: contentForm.title.trim(),
            notes: contentForm.notes.trim(),
            sortOrder: Number.parseInt(contentForm.sortOrder, 10) || 0,
            isPublished: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save banned content.");
      }

      await refreshBannedContent(true);
      setMessage(
        isEditing ? "Banned content updated." : "Banned content added.",
      );
      setEditingContentId(null);
      setContentForm(createEmptyContentForm(contentForm.sourcebookId));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save banned content.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteBook(book: SourcebookRow) {
    if (!book.id) {
      return;
    }

    setMessage("");
    setError("");

    try {
      setDeletingBookId(book.id);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/sourcebooks/${book.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to remove banned book.");
      }

      await refreshBannedContent(true);
      setMessage("Banned book removed.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to remove banned book.",
      );
    } finally {
      setDeletingBookId(null);
    }
  }

  async function handleDeleteContent(entry: BannedContentEntry) {
    if (!entry.id) {
      return;
    }

    setMessage("");
    setError("");

    try {
      setDeletingContentId(entry.id);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/banned-content/items/${entry.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to remove banned content.");
      }

      await refreshBannedContent(true);
      setMessage("Banned content removed.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to remove banned content.",
      );
    } finally {
      setDeletingContentId(null);
    }
  }

  function renderBookForm() {
    if (!isStaff || !bookFormOpen) {
      return null;
    }

    return (
      <form className={styles.editorPanel} onSubmit={handleBookSubmit}>
        <div className={styles.editorGrid}>
          <label className={styles.field}>
            <span>Title</span>
            <input
              className={styles.input}
              value={bookForm.title}
              onChange={(event) => updateBookForm("title", event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Publisher</span>
            <input
              className={styles.input}
              value={bookForm.publisher}
              onChange={(event) =>
                updateBookForm("publisher", event.target.value)
              }
            />
          </label>
          <label className={styles.field}>
            <span>Type</span>
            <input
              className={styles.input}
              value={bookForm.type}
              onChange={(event) => updateBookForm("type", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Edition</span>
            <input
              className={styles.input}
              value={bookForm.edition}
              onChange={(event) =>
                updateBookForm("edition", event.target.value)
              }
            />
          </label>
          <label className={styles.field}>
            <span>Sort Order</span>
            <input
              className={styles.input}
              type="number"
              value={bookForm.sortOrder}
              onChange={(event) =>
                updateBookForm("sortOrder", event.target.value)
              }
            />
          </label>
        </div>
        <div className={styles.editorActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setBookFormOpen(false);
              setEditingBookId(null);
            }}
          >
            Close
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : editingBookId !== null
                ? "Save Changes"
                : "Add Banned Book"}
          </button>
        </div>
      </form>
    );
  }

  function renderContentForm() {
    if (!isStaff || !contentFormOpen) {
      return null;
    }

    return (
      <form className={styles.editorPanel} onSubmit={handleContentSubmit}>
        <div className={styles.editorGrid}>
          <label className={styles.field}>
            <span>Sourcebook</span>
            <select
              className={styles.input}
              value={contentForm.sourcebookId}
              onChange={(event) =>
                updateContentForm("sourcebookId", event.target.value)
              }
              required
            >
              <option value="">Choose a sourcebook</option>
              {selectableSourcebooks.map((sourcebook) =>
                sourcebook.id ? (
                  <option key={sourcebook.id} value={sourcebook.id}>
                    {sourcebook.title}
                  </option>
                ) : null,
              )}
            </select>
          </label>
          <label className={styles.field}>
            <span>Content Type</span>
            <input
              className={styles.input}
              value={contentForm.contentType}
              onChange={(event) =>
                updateContentForm("contentType", event.target.value)
              }
              placeholder="Spell, feat, subclass..."
            />
          </label>
          <label className={styles.field}>
            <span>Title</span>
            <input
              className={styles.input}
              value={contentForm.title}
              onChange={(event) =>
                updateContentForm("title", event.target.value)
              }
              required
            />
          </label>
          <label className={styles.field}>
            <span>Sort Order</span>
            <input
              className={styles.input}
              type="number"
              value={contentForm.sortOrder}
              onChange={(event) =>
                updateContentForm("sortOrder", event.target.value)
              }
            />
          </label>
        </div>
        <label className={styles.field}>
          <span>Notes</span>
          <textarea
            className={styles.textarea}
            value={contentForm.notes}
            onChange={(event) => updateContentForm("notes", event.target.value)}
            rows={3}
          />
        </label>
        <div className={styles.editorActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setContentFormOpen(false);
              setEditingContentId(null);
            }}
          >
            Close
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : editingContentId !== null
                ? "Save Changes"
                : "Add Banned Content"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      {message ? <p className={styles.success}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.section}>
        <h2>Banned Books</h2>
        <p>
          These books, options, or exceptions are not allowed even though
          partnered content is generally permitted.
        </p>
        <p className={styles.count}>
          Showing {filteredBannedBooks.length} of {bannedBooks.length} banned
          book entries.
        </p>
        {isStaff ? (
          <div className={styles.editorActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openCreateBookForm}
            >
              Add Banned Book
            </button>
          </div>
        ) : null}
        {renderBookForm()}
        <div className={styles.searchPanel}>
          <label className={styles.searchLabel} htmlFor="banned-content-search">
            Search banned content
          </label>
          <input
            id="banned-content-search"
            className={styles.searchInput}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by book, content type, title, or notes"
          />
          {loading ? (
            <p className={styles.searchHint}>Loading banned content...</p>
          ) : null}
        </div>
        {filteredBannedBooks.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Publisher</th>
                <th>Specific Bans</th>
                {isStaff ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredBannedBooks.map((book) => (
                <tr key={book.id ?? book.title}>
                  <td>{book.title}</td>
                  <td>{book.publisher}</td>
                  <td>
                    {book.id && (book.bannedContentCount ?? 0) > 0 ? (
                      <a href={`#${slugForBook(book.id)}`}>
                        View {book.bannedContentCount}
                      </a>
                    ) : (
                      "None"
                    )}
                  </td>
                  {isStaff ? (
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.inlineButton}
                          onClick={() => beginEditingBook(book)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.inlineDangerButton}
                          disabled={deletingBookId === book.id}
                          onClick={() => handleDeleteBook(book)}
                        >
                          {deletingBookId === book.id
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyState}>
            No banned books match that search.
          </p>
        )}
      </div>

      <div className={styles.section}>
        <h2>Specific Banned Content</h2>
        <p>
          Individual options can be banned even when the sourcebook itself is
          allowed.
        </p>
        {isStaff ? (
          <div className={styles.editorActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => openCreateContentForm()}
            >
              Add Banned Content
            </button>
          </div>
        ) : null}
        {renderContentForm()}
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <section
              key={group.sourcebookId}
              id={slugForBook(group.sourcebookId)}
              className={styles.section}
            >
              <h3>{group.sourcebookTitle}</h3>
              <p className={styles.count}>
                {group.sourcebookPublisher}
                {group.sourcebookEdition ? ` | ${group.sourcebookEdition}` : ""}
              </p>
              {isStaff ? (
                <div className={styles.editorActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      openCreateContentForm(String(group.sourcebookId))
                    }
                  >
                    Add Entry For This Book
                  </button>
                </div>
              ) : null}
              {group.entries.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Notes</th>
                      {isStaff ? <th>Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry) => (
                      <tr
                        key={entry.id ?? `${entry.sourcebookId}-${entry.title}`}
                      >
                        <td>{entry.contentType || "Option"}</td>
                        <td>{entry.title}</td>
                        <td>{entry.notes}</td>
                        {isStaff ? (
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={styles.inlineButton}
                                onClick={() => beginEditingContent(entry)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={styles.inlineDangerButton}
                                disabled={deletingContentId === entry.id}
                                onClick={() => handleDeleteContent(entry)}
                              >
                                {deletingContentId === entry.id
                                  ? "Removing..."
                                  : "Remove"}
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={styles.emptyState}>
                  No specific entries match that search.
                </p>
              )}
            </section>
          ))
        ) : (
          <p className={styles.emptyState}>
            No specific banned content entries match that search.
          </p>
        )}
      </div>
    </>
  );
}
