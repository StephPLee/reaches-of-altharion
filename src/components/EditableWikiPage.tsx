import type { FormEvent, ReactElement, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import PageLoader from "./PageLoader";
import styles from "./EditableWikiPage.module.css";

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

type IconName =
  | "bold"
  | "italic"
  | "code"
  | "link"
  | "image"
  | "list"
  | "orderedList"
  | "table";

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function isSafeHref(value: string) {
  return /^(https?:\/\/|\/|#)/i.test(value);
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(!\[([^\]]*)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined && match[3]) {
      nodes.push(
        <img
          key={`${match.index}-image`}
          className={styles.markdownImage}
          src={isSafeHref(match[3]) ? match[3] : ""}
          alt={match[2]}
          loading="lazy"
        />,
      );
    } else if (match[5]) {
      nodes.push(<code key={`${match.index}-code`}>{match[5]}</code>);
    } else if (match[7]) {
      nodes.push(<strong key={`${match.index}-strong`}>{match[7]}</strong>);
    } else if (match[9]) {
      nodes.push(<em key={`${match.index}-em`}>{match[9]}</em>);
    } else if (match[10] && match[11]) {
      nodes.push(
        <a
          key={`${match.index}-link`}
          href={isSafeHref(match[11]) ? match[11] : "#"}
        >
          {match[10]}
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

function renderInlineMarkdownWithBreaks(lines: string[]): ReactNode[] {
  return lines.flatMap((line, index) => [
    ...(index > 0 ? [<br key={`br-${index}`} />] : []),
    ...renderInlineMarkdown(line),
  ]);
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isParagraphBlock(node: ReactNode): node is ReactElement {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as ReactElement).type === "p"
  );
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export type MarkdownHeading = {
  id: string;
  text: string;
  level: number;
};

function renderMarkdown(markdown: string): {
  blocks: ReactNode[];
  headings: MarkdownHeading[];
} {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  const headings: MarkdownHeading[] = [];
  const usedIds = new Map<string, number>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const fenceMatch = trimmed.match(/^```(\w+)?/);
    if (fenceMatch) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <pre key={`code-${index}`}>
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${index}`} />);
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const headingText = heading[2];
      const content = renderInlineMarkdown(headingText);
      const baseId = slugify(headingText) || `section-${index}`;
      const seenCount = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, seenCount + 1);
      const id = seenCount > 0 ? `${baseId}-${seenCount}` : baseId;
      headings.push({ id, text: headingText, level });

      if (level === 1) {
        blocks.push(
          <h1 id={id} key={`h-${index}`}>
            {content}
          </h1>,
        );
      } else if (level === 2) {
        blocks.push(
          <h2 id={id} key={`h-${index}`}>
            {content}
          </h2>,
        );
      } else if (level === 3) {
        blocks.push(
          <h3 id={id} key={`h-${index}`}>
            {content}
          </h3>,
        );
      } else {
        blocks.push(
          <h4 id={id} key={`h-${index}`}>
            {content}
          </h4>,
        );
      }
      continue;
    }

    if (trimmed.startsWith("|") && lines[index + 1] && isTableDivider(lines[index + 1])) {
      const headerCells = parseTableRow(trimmed);
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

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <blockquote key={`blockquote-${index}`}>
          <p>{renderInlineMarkdownWithBreaks(quoteLines)}</p>
        </blockquote>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const standaloneImage = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (standaloneImage) {
      const [, alt, src] = standaloneImage;
      let caption: string | null = null;
      const nextLine = lines[index + 1];
      if (nextLine && nextLine.trim()) {
        const captionMatch = nextLine.trim().match(/^\*([^*]+)\*$/);
        if (captionMatch) {
          caption = captionMatch[1];
          index += 1;
        }
      }

      const figure = (
        <figure key={`figure-${index}`} className={styles.mediaFigure}>
          <img
            className={styles.mediaImage}
            src={isSafeHref(src) ? src : ""}
            alt={alt}
            loading="lazy"
          />
          {caption ? (
            <figcaption className={styles.mediaCaption}>{caption}</figcaption>
          ) : null}
        </figure>
      );

      const textBlocks: ReactNode[] = [];
      while (blocks.length > 0 && isParagraphBlock(blocks[blocks.length - 1])) {
        textBlocks.unshift(blocks.pop());
      }

      if (textBlocks.length > 0) {
        blocks.push(
          <div key={`media-${index}`} className={styles.mediaRow}>
            <div className={styles.mediaText}>{textBlocks}</div>
            {figure}
          </div>,
        );
      } else {
        blocks.push(figure);
      }

      continue;
    }

    const paragraphLines = [trimmed];
    while (
      lines[index + 1] &&
      lines[index + 1].trim() &&
      !/^(#{1,4})\s+/.test(lines[index + 1].trim()) &&
      !/^[-*]\s+/.test(lines[index + 1].trim()) &&
      !/^>\s?/.test(lines[index + 1].trim()) &&
      !/^\d+\.\s+/.test(lines[index + 1].trim()) &&
      !lines[index + 1].trim().startsWith("|") &&
      !lines[index + 1].trim().startsWith("```") &&
      !/^!\[/.test(lines[index + 1].trim()) &&
      !/^---+$/.test(lines[index + 1].trim())
    ) {
      index += 1;
      paragraphLines.push(lines[index].trim());
    }

    blocks.push(
      <p key={`p-${index}`}>{renderInlineMarkdownWithBreaks(paragraphLines)}</p>,
    );
  }

  return { blocks, headings };
}

function insertMarkdown(
  textarea: HTMLTextAreaElement | null,
  value: string,
  updateMarkdown: (value: string) => void,
  markdown: string,
) {
  if (!textarea) {
    updateMarkdown(`${markdown}${value}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const nextMarkdown = `${markdown.slice(0, start)}${value}${markdown.slice(end)}`;
  updateMarkdown(nextMarkdown);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = start + value.length;
    textarea.selectionEnd = start + value.length;
  });
}

function ToolbarIcon({ name }: { name: IconName }) {
  if (name === "bold") {
    return <strong aria-hidden="true">B</strong>;
  }

  if (name === "italic") {
    return <em aria-hidden="true">I</em>;
  }

  const paths: Record<Exclude<IconName, "bold" | "italic">, ReactNode> = {
    code: (
      <>
        <path d="m8 9-4 3 4 3" />
        <path d="m16 9 4 3-4 3" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10.5" r="1.5" />
        <path d="m21 15-5-5L5 19" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    orderedList: (
      <>
        <path d="M10 6h11" />
        <path d="M10 12h11" />
        <path d="M10 18h11" />
        <path d="M4 6h1v4" />
        <path d="M4 10h2" />
        <path d="M3.5 15a1.5 1.5 0 0 1 3 0c0 1.5-3 1.5-3 3h3" />
      </>
    ),
    table: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M9 4v16" />
        <path d="M15 4v16" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={styles.toolbarIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {paths[name]}
    </svg>
  );
}

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
    () => renderMarkdown(page.markdown),
    [page.markdown],
  );
  const { blocks: renderedPreview } = useMemo(
    () => renderMarkdown(draftMarkdown),
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
              <ToolbarIcon name="bold" />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => formatInline("*", "*", "italic text")} title="Italic" aria-label="Italic">
              <ToolbarIcon name="italic" />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => formatInline("`", "`", "code")} title="Inline code" aria-label="Inline code">
              <ToolbarIcon name="code" />
            </button>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <button className={styles.toolbarButton} type="button" onClick={formatLink} title="Link" aria-label="Link">
              <ToolbarIcon name="link" />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => insert("\n![Image description](/img/guilds/guild-slug/image-name.png)\n")} title="Image" aria-label="Image">
              <ToolbarIcon name="image" />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => formatLines("- ", "List item")} title="Bulleted list" aria-label="Bulleted list">
              <ToolbarIcon name="list" />
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
              <ToolbarIcon name="orderedList" />
            </button>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <button className={styles.toolbarButton} type="button" onClick={() => insert("\n| Column | Column |\n| --- | --- |\n| Value | Value |\n")} title="Table" aria-label="Table">
              <ToolbarIcon name="table" />
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
