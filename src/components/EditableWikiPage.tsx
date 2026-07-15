import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import PageLoader from "./PageLoader";
import {
  insertMarkdown,
  renderMarkdown,
  ToolbarIcon,
  type MarkdownHeading,
} from "./wikiMarkdown";
import styles from "./EditableWikiPage.module.css";

export type { MarkdownHeading } from "./wikiMarkdown";

type EditableWikiPageProps = {
  slug: string;
  title: string;
  fallbackMarkdown: string;
  onTableOfContentsChange?: (headings: MarkdownHeading[]) => void;
};

type SessionUser = {
  isStaff: boolean;
};

type WikiPagePayload = {
  title: string;
  markdown: string;
};

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

const MEDIA_CLASS_NAMES = {
  markdownImage: styles.markdownImage,
  mediaFigure: styles.mediaFigure,
  mediaImage: styles.mediaImage,
  mediaCaption: styles.mediaCaption,
  mediaStandalone: styles.mediaStandalone,
  mediaSizeSmall: styles.mediaSizeSmall,
  mediaSizeMedium: styles.mediaSizeMedium,
  mediaSizeLarge: styles.mediaSizeLarge,
  mediaSizeFull: styles.mediaSizeFull,
  mediaAlignLeft: styles.mediaAlignLeft,
  mediaAlignRight: styles.mediaAlignRight,
  mediaAlignCenter: styles.mediaAlignCenter,
  mediaFloatLeft: styles.mediaFloatLeft,
  mediaFloatRight: styles.mediaFloatRight,
};

export default function EditableWikiPage({
  slug,
  title,
  fallbackMarkdown,
  onTableOfContentsChange,
}: EditableWikiPageProps): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [page, setPage] = useState<WikiPagePayload>({
    title,
    markdown: fallbackMarkdown.trim(),
  });
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftMarkdown, setDraftMarkdown] = useState(fallbackMarkdown.trim());
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        const response = await fetch(`${authApiBaseUrl}/api/wiki-pages/${slug}`);
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (!cancelled && payload.page?.markdown) {
          const nextPage = {
            title: payload.page.title || title,
            markdown: payload.page.markdown,
          };
          setPage(nextPage);
          setDraftTitle(nextPage.title);
          setDraftMarkdown(nextPage.markdown);
        }
      } catch {
        // Static fallback content remains available when the API is offline.
      } finally {
        if (!cancelled) {
          setIsPageLoading(false);
        }
      }
    }

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, fallbackMarkdown, slug, title]);

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

  const { blocks: renderedMarkdown, headings } = useMemo(
    () => renderMarkdown(page.markdown, MEDIA_CLASS_NAMES),
    [page.markdown],
  );
  const { blocks: renderedPreview } = useMemo(
    () => renderMarkdown(draftMarkdown, MEDIA_CLASS_NAMES),
    [draftMarkdown],
  );
  const tableOfContents = useMemo(
    () => headings.filter((entry) => entry.level === 2),
    [headings],
  );

  useEffect(() => {
    onTableOfContentsChange?.(tableOfContents);
  }, [tableOfContents, onTableOfContentsChange]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(`${authApiBaseUrl}/api/admin/wiki-pages/${slug}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim(),
          markdown: draftMarkdown.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save page.");
      }

      const nextPage = {
        title: payload.page?.title || draftTitle.trim(),
        markdown: payload.page?.markdown || draftMarkdown.trim(),
      };
      setPage(nextPage);
      setDraftTitle(nextPage.title);
      setDraftMarkdown(nextPage.markdown);
      setIsEditing(false);
      setMessage("Page updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save page.");
    } finally {
      setIsSaving(false);
    }
  }

  function beginEditing() {
    setDraftTitle(page.title);
    setDraftMarkdown(page.markdown);
    setError("");
    setMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftTitle(page.title);
    setDraftMarkdown(page.markdown);
    setIsEditing(false);
    setError("");
  }

  function insert(value: string) {
    insertMarkdown(textareaRef.current, value, setDraftMarkdown, draftMarkdown);
  }

  function replaceSelection(
    transformSelection: (value: string) => string,
    fallbackValue: string,
  ) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraftMarkdown(`${draftMarkdown}${fallbackValue}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = draftMarkdown.slice(start, end);
    const replacement = selectedText
      ? transformSelection(selectedText)
      : fallbackValue;
    const nextMarkdown = `${draftMarkdown.slice(0, start)}${replacement}${draftMarkdown.slice(end)}`;

    setDraftMarkdown(nextMarkdown);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = start + replacement.length;
    });
  }

  function formatInline(
    prefix: string,
    suffix: string,
    placeholder: string,
  ) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraftMarkdown(`${draftMarkdown}${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = draftMarkdown.slice(start, end);
    let nextMarkdown = draftMarkdown;
    let nextStart = start;
    let nextEnd = end;

    if (!selectedText) {
      const replacement = `${prefix}${placeholder}${suffix}`;
      nextMarkdown = `${draftMarkdown.slice(0, start)}${replacement}${draftMarkdown.slice(end)}`;
      nextEnd = start + replacement.length;
    } else if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix)) {
      const replacement = selectedText.slice(
        prefix.length,
        selectedText.length - suffix.length,
      );
      nextMarkdown = `${draftMarkdown.slice(0, start)}${replacement}${draftMarkdown.slice(end)}`;
      nextEnd = start + replacement.length;
    } else {
      const hasSurroundingMarkers =
        start >= prefix.length &&
        draftMarkdown.slice(start - prefix.length, start) === prefix &&
        draftMarkdown.slice(end, end + suffix.length) === suffix;
      const isSingleAsterisk =
        prefix === "*" &&
        suffix === "*" &&
        (draftMarkdown[start - 2] === "*" || draftMarkdown[end + 1] === "*");

      if (hasSurroundingMarkers && !isSingleAsterisk) {
        nextMarkdown =
          draftMarkdown.slice(0, start - prefix.length) +
          selectedText +
          draftMarkdown.slice(end + suffix.length);
        nextStart = start - prefix.length;
        nextEnd = nextStart + selectedText.length;
      } else {
        const replacement = `${prefix}${selectedText}${suffix}`;
        nextMarkdown = `${draftMarkdown.slice(0, start)}${replacement}${draftMarkdown.slice(end)}`;
        nextEnd = start + replacement.length;
      }
    }

    setDraftMarkdown(nextMarkdown);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = nextStart;
      textarea.selectionEnd = nextEnd;
    });
  }

  function formatLink() {
    replaceSelection(
      (selectedText) => `[${selectedText}](https://example.com)`,
      "[link text](https://example.com)",
    );
  }

  function formatLines(prefix: string, placeholder: string) {
    replaceSelection(
      (selectedText) =>
        selectedText
          .split("\n")
          .map((line) => (line.trim() ? `${prefix}${line}` : line))
          .join("\n"),
      `${prefix}${placeholder}`,
    );
  }

  function formatHeading(level: 1 | 2 | 3) {
    const marker = `${"#".repeat(level)} `;
    replaceSelection(
      (selectedText) =>
        selectedText
          .split("\n")
          .map((line) =>
            line.trim() ? `${marker}${line.replace(/^#{1,6}\s+/, "")}` : line,
          )
          .join("\n"),
      `${marker}Heading`,
    );
  }

  function applyBlockType(blockType: string) {
    if (blockType === "paragraph") {
      replaceSelection(
        (selectedText) =>
          selectedText
            .split("\n")
            .map((line) =>
              line
                .replace(/^#{1,6}\s+/, "")
                .replace(/^>\s?/, "")
                .replace(/^[-*]\s+/, "")
                .replace(/^\d+\.\s+/, ""),
            )
            .join("\n"),
        "Paragraph text",
      );
    } else if (blockType === "quote") {
      formatLines("> ", "Quote");
    } else if (blockType === "h1") {
      formatHeading(1);
    } else if (blockType === "h2") {
      formatHeading(2);
    } else if (blockType === "h3") {
      formatHeading(3);
    }
  }

  return (
    <div className={styles.shell}>
      {currentUser?.isStaff ? (
        <div className={styles.statusRow}>
          <div>
            {message ? <p className={styles.message}>{message}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}
          </div>
          {!isEditing ? (
            <button className={styles.button} type="button" onClick={beginEditing}>
              Edit Page
            </button>
          ) : null}
        </div>
      ) : null}

      {isEditing ? (
        <form className={styles.editorPanel} onSubmit={handleSave}>
          <div className={styles.editorHeader}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Title</span>
              <input
                className={styles.input}
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
              />
            </label>
          </div>
          <div className={styles.toolbar} aria-label="Markdown tools">
            <select
              className={styles.blockSelect}
              defaultValue=""
              onChange={(event) => {
                applyBlockType(event.target.value);
                event.target.value = "";
              }}
              disabled={isSaving}
              aria-label="Block type"
            >
              <option value="">Block type</option>
              <option value="paragraph">Paragraph</option>
              <option value="quote">Quote</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <button className={styles.toolbarButton} type="button" onClick={() => formatInline("**", "**", "bold text")} title="Bold" aria-label="Bold">
              <ToolbarIcon name="bold" className={styles.toolbarIcon} />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => formatInline("*", "*", "italic text")} title="Italic" aria-label="Italic">
              <ToolbarIcon name="italic" className={styles.toolbarIcon} />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => formatInline("`", "`", "code")} title="Inline code" aria-label="Inline code">
              <ToolbarIcon name="code" className={styles.toolbarIcon} />
            </button>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <button className={styles.toolbarButton} type="button" onClick={formatLink} title="Link" aria-label="Link">
              <ToolbarIcon name="link" className={styles.toolbarIcon} />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => insert("\n![Image description](/img/guilds/guild-slug/image-name.png)\n")} title="Image" aria-label="Image">
              <ToolbarIcon name="image" className={styles.toolbarIcon} />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => formatLines("- ", "List item")} title="Bulleted list" aria-label="Bulleted list">
              <ToolbarIcon name="list" className={styles.toolbarIcon} />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => {
              replaceSelection(
                (selectedText) =>
                  selectedText
                    .split("\n")
                    .map((line, index) =>
                      line.trim() ? `${index + 1}. ${line}` : line,
                    )
                    .join("\n"),
                "1. List item",
              );
            }} title="Numbered list" aria-label="Numbered list">
              <ToolbarIcon name="orderedList" className={styles.toolbarIcon} />
            </button>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <button className={styles.toolbarButton} type="button" onClick={() => insert("\n| Column | Column |\n| --- | --- |\n| Value | Value |\n")} title="Table" aria-label="Table">
              <ToolbarIcon name="table" className={styles.toolbarIcon} />
            </button>
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Markdown Content</span>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={draftMarkdown}
              onChange={(event) => setDraftMarkdown(event.target.value)}
            />
          </label>
          <div className={styles.editorActions}>
            <button className={styles.button} type="button" onClick={cancelEditing} disabled={isSaving}>
              Cancel
            </button>
            <button className={styles.button} type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Page"}
            </button>
          </div>
          <section className={styles.previewPanel}>
            <h2 className={styles.previewTitle}>Preview</h2>
            {renderedPreview}
          </section>
        </form>
      ) : isPageLoading ? (
        <PageLoader label="Loading page" />
      ) : (
        <div className={styles.content}>{renderedMarkdown}</div>
      )}
    </div>
  );
}
