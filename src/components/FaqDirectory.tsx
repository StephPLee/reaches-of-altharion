import { FormEvent, ReactNode, useEffect, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./FaqDirectory.module.css";

type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

type FaqCategory = {
  id: string;
  name: string;
  description: string;
  entries: FaqEntry[];
};

type SessionUser = {
  username: string;
  globalName: string | null;
  isStaff: boolean;
};

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`([^`]+)`)|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    if (match[2]) {
      nodes.push(<code key={`${match.index}-code`}>{match[2]}</code>);
    } else if (match[3] && match[4]) {
      nodes.push(
        <a key={`${match.index}-link`} href={match[4]}>
          {match[3]}
        </a>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderMarkdownBlock(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.trim()) {
      continue;
    }

    if (
      line.trim().startsWith("|") &&
      lines[index + 1] &&
      isTableDivider(lines[index + 1])
    ) {
      const headerCells = parseTableRow(line);
      const bodyRows: string[][] = [];
      index += 2;

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        bodyRows.push(parseTableRow(lines[index]));
        index += 1;
      }

      index -= 1;
      blocks.push(
        <table key={`table-${index}`}>
          <thead>
            <tr>
              {headerCells.map((cell) => (
                <th key={cell}>{renderInlineMarkdown(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>
                    {renderInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    const paragraphLines = [line.trim()];
    while (
      lines[index + 1] &&
      lines[index + 1].trim() &&
      !lines[index + 1].trim().startsWith("|")
    ) {
      index += 1;
      paragraphLines.push(lines[index].trim());
    }

    blocks.push(
      <p key={`p-${index}`}>{renderInlineMarkdown(paragraphLines.join(" "))}</p>,
    );
  }

  return blocks;
}

function cloneCategories(categories: FaqCategory[]) {
  return categories.map((category) => ({
    ...category,
    entries: category.entries.map((entry) => ({ ...entry })),
  }));
}

function createDraftId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildFaqMarkdown(categories: FaqCategory[]) {
  const lines = [
    "---",
    "title: FAQ",
    "---",
    "",
    "# Frequently Asked Questions",
    "",
    'This should be your first port of call to check for answers to questions you have. It will be updated as more questions become "frequent".',
  ];

  for (const category of categories) {
    const name = category.name.trim();
    if (!name) {
      continue;
    }

    lines.push("", `## ${name}`, "");
    if (category.description.trim()) {
      lines.push(category.description.trim(), "");
    }

    for (const entry of category.entries) {
      const question = entry.question.trim();
      if (!question) {
        continue;
      }

      lines.push(
        `### ${question}`,
        "",
        entry.answer.trim() || "No answer has been added yet.",
        "",
      );
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

export default function FaqDirectory() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [draftCategories, setDraftCategories] = useState<FaqCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<
    number | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isStaff = Boolean(currentUser?.isStaff);

  async function refreshFaq() {
    const response = await fetch(`${authApiBaseUrl}/api/faq`);
    if (!response.ok) {
      throw new Error(`Failed to load FAQ (${response.status}).`);
    }

    const payload = await response.json();
    const nextCategories = Array.isArray(payload.categories)
      ? payload.categories
      : [];
    setCategories(nextCategories);
    setDraftCategories(cloneCategories(nextCategories));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadFaq() {
      try {
        setLoading(true);
        await refreshFaq();
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load FAQ.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFaq();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setAuthLoading(true);
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
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(`${authApiBaseUrl}/api/admin/faq`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: buildFaqMarkdown(draftCategories) }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save FAQ.");
      }

      const nextCategories = Array.isArray(payload.categories)
        ? payload.categories
        : [];
      setCategories(nextCategories);
      setDraftCategories(cloneCategories(nextCategories));
      setEditingCategoryIndex(null);
      setMessage("FAQ updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save FAQ.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateDraftCategory(
    categoryIndex: number,
    field: "name" | "description",
    value: string,
  ) {
    setDraftCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex ? { ...category, [field]: value } : category,
      ),
    );
  }

  function updateDraftEntry(
    categoryIndex: number,
    entryIndex: number,
    field: "question" | "answer",
    value: string,
  ) {
    setDraftCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              entries: category.entries.map((entry, currentEntryIndex) =>
                currentEntryIndex === entryIndex
                  ? { ...entry, [field]: value }
                  : entry,
              ),
            }
          : category,
      ),
    );
  }

  function beginEditingCategory(categoryIndex: number) {
    setDraftCategories(cloneCategories(categories));
    setEditingCategoryIndex(categoryIndex);
    setError("");
    setMessage("");
  }

  function cancelEditingCategory() {
    setDraftCategories(cloneCategories(categories));
    setEditingCategoryIndex(null);
    setError("");
  }

  function addCategoryAndEdit() {
    setDraftCategories(() => {
      const next = [
        ...cloneCategories(categories),
        {
          id: createDraftId("category"),
          name: "New Category",
          description: "",
          entries: [],
        },
      ];
      setEditingCategoryIndex(next.length - 1);
      return next;
    });
    setError("");
    setMessage("");
  }

  function removeDraftCategory(categoryIndex: number) {
    setDraftCategories((current) =>
      current.filter((_, index) => index !== categoryIndex),
    );
  }

  function addDraftEntry(categoryIndex: number) {
    setDraftCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              entries: [
                ...category.entries,
                {
                  id: createDraftId("entry"),
                  question: "New Question",
                  answer: "",
                },
              ],
            }
          : category,
      ),
    );
  }

  function removeDraftEntry(categoryIndex: number, entryIndex: number) {
    setDraftCategories((current) =>
      current.map((category, index) =>
        index === categoryIndex
          ? {
              ...category,
              entries: category.entries.filter(
                (_, currentEntryIndex) => currentEntryIndex !== entryIndex,
              ),
            }
          : category,
      ),
    );
  }

  function renderCategoryEditor(
    category: FaqCategory,
    categoryIndex: number,
  ) {
    return (
      <form className={styles.editorPanel} onSubmit={handleSubmit}>
        <section className={styles.editorCategory}>
          <div className={styles.editorHeader}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Category</span>
              <input
                className={styles.input}
                value={category.name}
                onChange={(event) =>
                  updateDraftCategory(categoryIndex, "name", event.target.value)
                }
              />
            </label>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => removeDraftCategory(categoryIndex)}
              disabled={isSaving}
            >
              Remove Category
            </button>
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Category Intro</span>
            <textarea
              className={styles.textarea}
              value={category.description}
              onChange={(event) =>
                updateDraftCategory(
                  categoryIndex,
                  "description",
                  event.target.value,
                )
              }
            />
          </label>
          <div className={styles.editorEntries}>
            {category.entries.map((entry, entryIndex) => (
              <section className={styles.editorEntry} key={entry.id}>
                <div className={styles.editorHeader}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Question</span>
                    <input
                      className={styles.input}
                      value={entry.question}
                      onChange={(event) =>
                        updateDraftEntry(
                          categoryIndex,
                          entryIndex,
                          "question",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => removeDraftEntry(categoryIndex, entryIndex)}
                    disabled={isSaving}
                  >
                    Remove Question
                  </button>
                </div>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Answer</span>
                  <textarea
                    className={styles.textarea}
                    value={entry.answer}
                    onChange={(event) =>
                      updateDraftEntry(
                        categoryIndex,
                        entryIndex,
                        "answer",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </section>
            ))}
          </div>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => addDraftEntry(categoryIndex)}
            disabled={isSaving}
          >
            Add Question
          </button>
        </section>
        <div className={styles.formActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={cancelEditingCategory}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Section"}
          </button>
        </div>
      </form>
    );
  }

  function renderCategory(category: FaqCategory, categoryIndex: number) {
    const isEditingThisCategory = editingCategoryIndex === categoryIndex;
    const displayCategory = isEditingThisCategory
      ? draftCategories[categoryIndex]
      : category;

    if (!displayCategory) {
      return null;
    }

    return (
      <section className={styles.category} key={displayCategory.id}>
        <div className={styles.categoryHeader}>
          <h2 className={styles.categoryTitle}>{displayCategory.name}</h2>
          {isStaff ? (
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() =>
                isEditingThisCategory
                  ? cancelEditingCategory()
                  : beginEditingCategory(categoryIndex)
              }
              disabled={isSaving}
            >
              {isEditingThisCategory ? "Close Editor" : "Edit Section"}
            </button>
          ) : null}
        </div>
        {isEditingThisCategory ? (
          renderCategoryEditor(displayCategory, categoryIndex)
        ) : (
          <>
            {displayCategory.description ? (
              <div className={styles.description}>
                {renderMarkdownBlock(displayCategory.description)}
              </div>
            ) : null}
            {displayCategory.entries.map((entry) => (
              <article className={styles.entry} key={entry.id}>
                <h3 className={styles.entryTitle}>{entry.question}</h3>
                <div className={styles.answer}>
                  {renderMarkdownBlock(entry.answer)}
                </div>
              </article>
            ))}
          </>
        )}
      </section>
    );
  }

  return (
    <section className={styles.shell}>
      {isStaff ? (
        <div className={styles.controlsPanel}>
          <div className={styles.controlsRow}>
            <span>Signed in with FAQ editing access</span>
            <button
              className={styles.controlButton}
              type="button"
              onClick={addCategoryAndEdit}
              disabled={isSaving}
            >
              Add Section
            </button>
          </div>
          {message ? <p className={styles.message}>{message}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      ) : null}

      {loading || authLoading ? <p>Loading FAQ...</p> : null}
      {!isStaff && error ? <p className={styles.error}>{error}</p> : null}

      {(editingCategoryIndex !== null && editingCategoryIndex >= categories.length
        ? draftCategories
        : categories
      ).map(renderCategory)}
    </section>
  );
}
