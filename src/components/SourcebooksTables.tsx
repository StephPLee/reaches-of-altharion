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
  isPublished?: boolean;
};

type SessionUser = {
  id?: number;
  username: string;
  globalName: string | null;
  isStaff: boolean;
};

type SourcebookFormState = {
  listType: "allowed" | "not_allowed";
  title: string;
  publisher: string;
  type: string;
  edition: string;
  sortOrder: string;
};

const NOT_ALLOWED_BOOKS: SourcebookRow[] = [
  {
    title: "Book of Ebon Tides",
    publisher: "Kobold Press",
    type: "Partnered sourcebook",
    edition: "5e",
  },
  {
    title: "Grim Hollow: Races and Dark Bargains",
    publisher: "Ghostfire Gaming",
    type: "Partnered player options",
    edition: "5e",
  },
  {
    title: "Iron Hero Feat",
    publisher: "Third-party",
    type: "Partnered / homebrew feat",
    edition: "5e",
  },
  {
    title: "Obojima: Tales from the Tall Grass consumables",
    publisher: "1985 Games",
    type: "Partnered item content",
    edition: "5e",
  },
  {
    title: "Dungeons & Dragons vs. Rick and Morty",
    publisher: "Wizards of the Coast",
    type: "Boxed adventure product",
    edition: "5e",
  },
  {
    title: "The Lord of the Rings Roleplaying",
    publisher: "Free League",
    type: "Partnered sourcebook",
    edition: "5e",
  },
  {
    title: "The Pugilist Class",
    publisher: "Third-party",
    type: "Partnered class",
    edition: "5e / 5.5e",
  },
];

const ALLOWED_BOOKS: SourcebookRow[] = [
  {
    title: "Basic Rules (2014)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5e",
  },
  {
    title: "Elemental Evil Player's Companion",
    publisher: "Wizards of the Coast",
    type: "Player supplement",
    edition: "5e",
  },
  {
    title: "Player's Handbook (2014)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5e",
  },
  {
    title: "Dungeon Master's Guide (2014)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5e",
  },
  {
    title: "Monster Manual (2014)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5e",
  },
  {
    title: "Sword Coast Adventurer's Guide",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Xanathar's Guide to Everything",
    publisher: "Wizards of the Coast",
    type: "Rules expansion",
    edition: "5e",
  },
  {
    title: "Volo's Guide to Monsters",
    publisher: "Wizards of the Coast",
    type: "Monsters / lore",
    edition: "5e",
  },
  {
    title: "Mordenkainen's Tome of Foes",
    publisher: "Wizards of the Coast",
    type: "Monsters / lore",
    edition: "5e",
  },
  {
    title: "Guildmasters' Guide to Ravnica",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Acquisitions Incorporated",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Eberron: Rising from the Last War",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Explorer's Guide to Wildemount",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Mythic Odysseys of Theros",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Tasha's Cauldron of Everything",
    publisher: "Wizards of the Coast",
    type: "Rules expansion",
    edition: "5e",
  },
  {
    title: "Van Richten's Guide to Ravenloft",
    publisher: "Wizards of the Coast",
    type: "Setting / monsters",
    edition: "5e",
  },
  {
    title: "Fizban's Treasury of Dragons",
    publisher: "Wizards of the Coast",
    type: "Rules / monsters",
    edition: "5e",
  },
  {
    title: "Strixhaven: A Curriculum of Chaos",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Mordenkainen Presents: Monsters of the Multiverse",
    publisher: "Wizards of the Coast",
    type: "Rules / monsters",
    edition: "5e",
  },
  {
    title: "Spelljammer: Adventures in Space",
    publisher: "Wizards of the Coast",
    type: "Setting / rules set",
    edition: "5e",
  },
  {
    title: "Bigby Presents: Glory of the Giants",
    publisher: "Wizards of the Coast",
    type: "Rules expansion",
    edition: "5e",
  },
  {
    title: "Planescape: Adventures in the Multiverse",
    publisher: "Wizards of the Coast",
    type: "Setting / rules set",
    edition: "5e",
  },
  {
    title: "The Book of Many Things",
    publisher: "Wizards of the Coast",
    type: "Rules expansion",
    edition: "5e",
  },
  {
    title: "Player's Handbook (2024)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5.5e",
  },
  {
    title: "Dungeon Master's Guide (2024)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5.5e",
  },
  {
    title: "Monster Manual (2024)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5.5e",
  },
  {
    title: "Eberron: Forge of the Artificer",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5.5e",
  },
  {
    title: "Heroes of Faerun",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5.5e",
  },
  {
    title: "Adventures in Faerun",
    publisher: "Wizards of the Coast",
    type: "Setting / rules support",
    edition: "5.5e",
  },
  {
    title: "Tal'Dorei Campaign Setting Reborn",
    publisher: "Darrington Press",
    type: "Partnered sourcebook",
    edition: "5e",
  },
  {
    title: "Dungeons of Drakkenheim",
    publisher: "Ghostfire Gaming",
    type: "Partnered setting book",
    edition: "5e",
  },
  {
    title: "Sebastian Crowe's Guide to Drakkenheim",
    publisher: "Ghostfire Gaming",
    type: "Partnered setting / player options",
    edition: "5e",
  },
  {
    title: "Humblewood Campaign Setting",
    publisher: "Hit Point Press",
    type: "Partnered setting book",
    edition: "5e",
  },
  {
    title: "Humblewood Tales",
    publisher: "Hit Point Press",
    type: "Partnered supplement",
    edition: "Mixed",
  },
  {
    title: "Tome of Beasts 1",
    publisher: "Kobold Press",
    type: "Partnered monster book",
    edition: "5e",
  },
  {
    title: "Flee, Mortals!",
    publisher: "MCDM",
    type: "Partnered monster book",
    edition: "5e",
  },
  {
    title: "Where Evil Lives",
    publisher: "MCDM",
    type: "Partnered encounter / monster book",
    edition: "5e",
  },
  {
    title: "Grim Hollow: Player Pack",
    publisher: "Ghostfire Gaming",
    type: "Partnered player options",
    edition: "5e",
  },
  {
    title: "Grim Hollow: Player's Guide",
    publisher: "Ghostfire Gaming",
    type: "Partnered sourcebook",
    edition: "5.5e",
  },
  {
    title: "Grim Hollow: Campaign Guide",
    publisher: "Ghostfire Gaming",
    type: "Partnered setting book",
    edition: "5.5e",
  },
  {
    title: "Tales from the Shadows",
    publisher: "Kobold Press",
    type: "Partnered sourcebook",
    edition: "5e",
  },
  {
    title: "The Illrigger Revised",
    publisher: "MCDM",
    type: "Partnered class",
    edition: "5e",
  },
  {
    title: "The Griffon's Saddlebag: Book Two",
    publisher: "The Griffon's Saddlebag",
    type: "Partnered item book",
    edition: "5e",
  },
  {
    title: "Heliana's Guide to Monster Hunting: Part 1",
    publisher: "Loot Tavern",
    type: "Partnered sourcebook",
    edition: "Mixed",
  },
  {
    title: "Obojima: Tales from the Tall Grass",
    publisher: "1985 Games",
    type: "Partnered setting book",
    edition: "5e",
  },
  {
    title: "Valda's Spire of Secrets: Player Pack",
    publisher: "Mage Hand Press",
    type: "Partnered player options",
    edition: "5e",
  },
  {
    title: "Ruins of Symbaroum: Setting Handbook",
    publisher: "Free League",
    type: "Partnered setting book",
    edition: "5e",
  },
  {
    title: "The Crooked Moon Part One: Player Options & Campaign Setting",
    publisher: "Legends of Avantris",
    type: "Partnered sourcebook",
    edition: "Mixed",
  },
  {
    title: "Exploring Eberron (2024)",
    publisher: "Visionary Creative / Keith Baker",
    type: "Partnered setting book",
    edition: "5.5e",
  },
];

function matchesSearch(row: SourcebookRow, query: string) {
  if (!query) {
    return true;
  }

  const haystack =
    `${row.title} ${row.publisher} ${row.type} ${row.edition}`.toLowerCase();
  return haystack.includes(query);
}

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function createEmptyForm(listType: "allowed" | "not_allowed"): SourcebookFormState {
  return {
    listType,
    title: "",
    publisher: "",
    type: "",
    edition: "",
    sortOrder: "0",
  };
}

function SourcebookTable({
  books,
  isStaff,
  onEdit,
  onDelete,
  deletingId,
}: {
  books: SourcebookRow[];
  isStaff: boolean;
  onEdit: (book: SourcebookRow) => void;
  onDelete: (book: SourcebookRow) => void;
  deletingId: number | null;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Publisher</th>
          <th>Type</th>
          <th>Edition</th>
          {isStaff ? <th>Actions</th> : null}
        </tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <tr key={book.id ?? `${book.title}-${book.publisher}`}>
            <td>{book.title}</td>
            <td>{book.publisher}</td>
            <td>{book.type}</td>
            <td>{book.edition}</td>
            {isStaff ? (
              <td>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.inlineButton}
                    disabled={!book.id}
                    onClick={() => onEdit(book)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.inlineDangerButton}
                    disabled={!book.id || deletingId === book.id}
                    onClick={() => onDelete(book)}
                  >
                    {deletingId === book.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function SourcebooksTables() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [search, setSearch] = useState("");
  const [allowedBooks, setAllowedBooks] = useState<SourcebookRow[]>(ALLOWED_BOOKS);
  const [notAllowedBooks, setNotAllowedBooks] =
    useState<SourcebookRow[]>(NOT_ALLOWED_BOOKS);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpenFor, setFormOpenFor] = useState<"allowed" | "not_allowed" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<SourcebookFormState>(createEmptyForm("allowed"));
  const normalizedSearch = search.trim().toLowerCase();
  const isStaff = Boolean(currentUser?.isStaff);

  async function refreshSourcebooks(useAdminEndpoint = isStaff) {
    const response = await fetch(
      `${authApiBaseUrl}${useAdminEndpoint ? "/api/admin/sourcebooks" : "/api/sourcebooks"}`,
      useAdminEndpoint ? { credentials: "include" } : undefined,
    );

    if (!response.ok) {
      throw new Error(`Failed to load sourcebooks (${response.status}).`);
    }

    const payload = await response.json();
    setAllowedBooks(Array.isArray(payload.allowed) ? payload.allowed : []);
    setNotAllowedBooks(
      Array.isArray(payload.notAllowed) ? payload.notAllowed : [],
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSourcebooks() {
      try {
        setLoading(true);
        const response = await fetch(`${authApiBaseUrl}/api/sourcebooks`);

        if (!response.ok) {
          throw new Error(`Failed to load sourcebooks (${response.status}).`);
        }

        const payload = await response.json();

        if (!cancelled) {
          setAllowedBooks(Array.isArray(payload.allowed) ? payload.allowed : []);
          setNotAllowedBooks(
            Array.isArray(payload.notAllowed) ? payload.notAllowed : [],
          );
        }
      } catch {
        if (!cancelled) {
          setAllowedBooks(ALLOWED_BOOKS);
          setNotAllowedBooks(NOT_ALLOWED_BOOKS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSourcebooks();

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

    refreshSourcebooks(true).catch(() => undefined);
  }, [authApiBaseUrl, isStaff]);

  const filteredNotAllowed = useMemo(
    () =>
      notAllowedBooks.filter((book) => matchesSearch(book, normalizedSearch)),
    [normalizedSearch, notAllowedBooks],
  );

  const filteredAllowed = useMemo(
    () => allowedBooks.filter((book) => matchesSearch(book, normalizedSearch)),
    [normalizedSearch, allowedBooks],
  );

  function updateFormField(field: keyof SourcebookFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateForm(listType: "allowed" | "not_allowed") {
    setFormOpenFor(listType);
    setEditingId(null);
    setForm(createEmptyForm(listType));
    setFormMessage("");
    setFormError("");
  }

  function beginEditing(book: SourcebookRow) {
    if (!book.id || !book.listType) {
      return;
    }

    setFormOpenFor(book.listType);
    setEditingId(book.id);
    setForm({
      listType: book.listType,
      title: book.title,
      publisher: book.publisher,
      type: book.type,
      edition: book.edition,
      sortOrder: String(book.sortOrder ?? 0),
    });
    setFormMessage("");
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const isEditing = editingId !== null;
      const response = await fetch(
        isEditing
          ? `${authApiBaseUrl}/api/admin/sourcebooks/${editingId}`
          : `${authApiBaseUrl}/api/admin/sourcebooks`,
        {
          method: isEditing ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            listType: form.listType,
            title: form.title.trim(),
            publisher: form.publisher.trim(),
            type: form.type.trim(),
            edition: form.edition.trim(),
            sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
            isPublished: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save sourcebook.");
      }

      await refreshSourcebooks(true);
      setFormMessage(isEditing ? "Sourcebook updated." : "Sourcebook added.");
      setEditingId(null);
      setForm(createEmptyForm(form.listType));
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save sourcebook.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(book: SourcebookRow) {
    if (!book.id) {
      return;
    }

    setFormMessage("");
    setFormError("");

    try {
      setDeletingId(book.id);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/sourcebooks/${book.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to remove sourcebook.");
      }

      await refreshSourcebooks(true);
      setFormMessage("Sourcebook removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to remove sourcebook.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function renderStaffForm(listType: "allowed" | "not_allowed") {
    if (!isStaff || formOpenFor !== listType) {
      return null;
    }

    return (
      <form className={styles.editorPanel} onSubmit={handleSubmit}>
        <div className={styles.editorGrid}>
          <label className={styles.field}>
            <span>List</span>
            <select
              className={styles.input}
              value={form.listType}
              onChange={(event) =>
                updateFormField(
                  "listType",
                  event.target.value as "allowed" | "not_allowed",
                )
              }
            >
              <option value="allowed">Allowed Reference List</option>
              <option value="not_allowed">Not Allowed</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Title</span>
            <input
              className={styles.input}
              value={form.title}
              onChange={(event) => updateFormField("title", event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Publisher</span>
            <input
              className={styles.input}
              value={form.publisher}
              onChange={(event) =>
                updateFormField("publisher", event.target.value)
              }
            />
          </label>
          <label className={styles.field}>
            <span>Type</span>
            <input
              className={styles.input}
              value={form.type}
              onChange={(event) => updateFormField("type", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Edition</span>
            <input
              className={styles.input}
              value={form.edition}
              onChange={(event) =>
                updateFormField("edition", event.target.value)
              }
            />
          </label>
          <label className={styles.field}>
            <span>Sort Order</span>
            <input
              className={styles.input}
              type="number"
              value={form.sortOrder}
              onChange={(event) =>
                updateFormField("sortOrder", event.target.value)
              }
            />
          </label>
        </div>
        {formMessage ? <p className={styles.success}>{formMessage}</p> : null}
        {formError ? <p className={styles.error}>{formError}</p> : null}
        <div className={styles.editorActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setFormOpenFor(null);
              setEditingId(null);
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
              : editingId !== null
                ? "Save Changes"
                : "Add Sourcebook"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className={styles.searchPanel}>
        <label className={styles.searchLabel} htmlFor="sourcebooks-search">
          Search sourcebooks
        </label>
        <input
          id="sourcebooks-search"
          className={styles.searchInput}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title, publisher, type, or edition"
        />
        <p className={styles.searchHint}>
          The search filters both the not allowed list and the allowed reference
          list.
        </p>
        {loading ? <p className={styles.searchHint}>Loading sourcebooks...</p> : null}
      </div>

      <div className={styles.section}>
        <h2>Not Allowed</h2>
        <p>
          These books, options, or exceptions are not allowed even though
          partnered content is generally permitted.
        </p>
        <p className={styles.count}>
          Showing {filteredNotAllowed.length} of {notAllowedBooks.length} not
          allowed entries.
        </p>
        {isStaff ? (
          <div className={styles.editorActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => openCreateForm("not_allowed")}
            >
              Add Not Allowed Entry
            </button>
          </div>
        ) : null}
        {renderStaffForm("not_allowed")}
        {filteredNotAllowed.length > 0 ? (
          <SourcebookTable
            books={filteredNotAllowed}
            isStaff={isStaff}
            onEdit={beginEditing}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ) : (
          <p className={styles.emptyState}>
            No not allowed entries match that search.
          </p>
        )}
      </div>

      <div className={styles.section}>
        <h2>Allowed Reference List</h2>
        <p>
          This list is here as a reference for books players are generally
          allowed to use.
        </p>
        <p className={styles.count}>
          Showing {filteredAllowed.length} of {allowedBooks.length} allowed
          reference entries.
        </p>
        {isStaff ? (
          <div className={styles.editorActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => openCreateForm("allowed")}
            >
              Add Allowed Entry
            </button>
          </div>
        ) : null}
        {renderStaffForm("allowed")}
        {filteredAllowed.length > 0 ? (
          <SourcebookTable
            books={filteredAllowed}
            isStaff={isStaff}
            onEdit={beginEditing}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        ) : (
          <p className={styles.emptyState}>
            No allowed entries match that search.
          </p>
        )}
      </div>
    </>
  );
}
