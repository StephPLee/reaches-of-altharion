import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "@docusaurus/router";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import {
  insertMarkdown,
  renderMarkdown,
  ToolbarIcon,
  type ImageAlign,
  type ImageSize,
} from "../wikiMarkdown";
import PageLoader from "../PageLoader";
import ImageCropDialog from "./ImageCropDialog";
import ToastStack from "./ToastStack";
import { uploadWorldWikiImage } from "./uploadImage";
import { useToasts } from "./useToasts";
import styles from "./WorldWiki.module.css";
import {
  getAuthApiBaseUrl,
  type SessionUser,
  type WorldWikiAttribute,
  type WorldWikiCategory,
  type WorldWikiPage,
} from "./types";

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

const IMAGE_SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "full", label: "Full width" },
];

const IMAGE_ALIGN_OPTIONS: { value: ImageAlign; label: string }[] = [
  { value: "left", label: "Left of text" },
  { value: "right", label: "Right of text" },
  { value: "center", label: "Centered" },
];

type WorldWikiArticleProps = {
  slug: string | null;
};

const EMPTY_PAGE: WorldWikiPage = {
  slug: "",
  title: "",
  markdown: "",
  category: null,
  coverImagePath: null,
  attributes: [],
  isDraft: false,
  gmOnly: false,
  updatedAt: new Date().toISOString(),
};

export default function WorldWikiArticle({ slug }: WorldWikiArticleProps): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const history = useHistory();
  const isCreateMode = slug === null;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [categories, setCategories] = useState<WorldWikiCategory[]>([]);
  const [page, setPage] = useState<WorldWikiPage | null>(isCreateMode ? EMPTY_PAGE : null);
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftMarkdown, setDraftMarkdown] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState<string>("");
  const [draftCoverImagePath, setDraftCoverImagePath] = useState<string | null>(null);
  const [draftAttributes, setDraftAttributes] = useState<WorldWikiAttribute[]>([]);
  const [draftIsDraft, setDraftIsDraft] = useState(false);
  const [draftGmOnly, setDraftGmOnly] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [nextImageSize, setNextImageSize] = useState<ImageSize>("medium");
  const [nextImageAlign, setNextImageAlign] = useState<ImageAlign>("right");
  const [nextImageCaption, setNextImageCaption] = useState("");
  const { toasts, showToast, dismissToast } = useToasts();

  function loadDraftFromPage(sourcePage: WorldWikiPage) {
    setDraftTitle(sourcePage.title);
    setDraftMarkdown(sourcePage.markdown);
    setDraftCategoryId(sourcePage.category ? String(sourcePage.category.id) : "");
    setDraftCoverImagePath(sourcePage.coverImagePath);
    setDraftAttributes(sourcePage.attributes.length ? sourcePage.attributes : []);
    setDraftIsDraft(sourcePage.isDraft);
    setDraftGmOnly(sourcePage.gmOnly);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const sessionResponse = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });
        const sessionPayload = await sessionResponse.json().catch(() => ({}));
        if (!cancelled) {
          setCurrentUser(sessionPayload.authenticated ? sessionPayload.user : null);
        }

        const categoriesResponse = await fetch(`${authApiBaseUrl}/api/world-wiki/categories`);
        const categoriesPayload = await categoriesResponse.json().catch(() => ({}));
        if (!cancelled) {
          setCategories(
            Array.isArray(categoriesPayload.categories) ? categoriesPayload.categories : [],
          );
        }

        if (isCreateMode) {
          if (!cancelled) {
            loadDraftFromPage(EMPTY_PAGE);
          }
          return;
        }

        const pageResponse = await fetch(`${authApiBaseUrl}/api/world-wiki/pages/${slug}`, {
          credentials: "include",
        });

        if (pageResponse.status === 404) {
          if (!cancelled) {
            setNotFound(true);
          }
          return;
        }

        const pagePayload = await pageResponse.json().catch(() => ({}));
        if (!cancelled && pagePayload.page) {
          setPage(pagePayload.page);
          loadDraftFromPage(pagePayload.page);
        }
      } catch {
        if (!cancelled) {
          setNotFound(true);
        }
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
  }, [authApiBaseUrl, slug, isCreateMode]);

  const { blocks: renderedMarkdown } = useMemo(
    () => renderMarkdown(page?.markdown || "", MEDIA_CLASS_NAMES),
    [page?.markdown],
  );
  const { blocks: renderedPreview } = useMemo(
    () => renderMarkdown(draftMarkdown, MEDIA_CLASS_NAMES),
    [draftMarkdown],
  );

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
    const replacement = selectedText ? transformSelection(selectedText) : fallbackValue;
    const nextMarkdown = `${draftMarkdown.slice(0, start)}${replacement}${draftMarkdown.slice(end)}`;

    setDraftMarkdown(nextMarkdown);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = start + replacement.length;
    });
  }

  function formatInline(prefix: string, suffix: string, placeholder: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraftMarkdown(`${draftMarkdown}${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = draftMarkdown.slice(start, end);
    let nextMarkdown = draftMarkdown;
    let nextEnd = end;

    if (!selectedText) {
      const replacement = `${prefix}${placeholder}${suffix}`;
      nextMarkdown = `${draftMarkdown.slice(0, start)}${replacement}${draftMarkdown.slice(end)}`;
      nextEnd = start + replacement.length;
    } else {
      const replacement = `${prefix}${selectedText}${suffix}`;
      nextMarkdown = `${draftMarkdown.slice(0, start)}${replacement}${draftMarkdown.slice(end)}`;
      nextEnd = start + replacement.length;
    }

    setDraftMarkdown(nextMarkdown);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = nextEnd;
    });
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
          .map((line) => (line.trim() ? `${marker}${line.replace(/^#{1,6}\s+/, "")}` : line))
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

  function handleCoverImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setPendingCoverFile(file);
  }

  async function handleCoverImageCropped(blob: Blob) {
    setPendingCoverFile(null);
    try {
      setIsUploadingCover(true);
      const url = await uploadWorldWikiImage(authApiBaseUrl, blob);
      if (url) {
        setDraftCoverImagePath(url);
      }
    } catch (uploadError) {
      showToast("error", uploadError instanceof Error ? uploadError.message : "Failed to upload image.");
    } finally {
      setIsUploadingCover(false);
    }
  }

  async function handleInlineImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const url = await uploadWorldWikiImage(authApiBaseUrl, file, file.name);
      if (url) {
        const caption = nextImageCaption.trim();
        const captionLine = caption ? `*${caption}*\n` : "";
        insert(`\n![Image](${url} "size=${nextImageSize} align=${nextImageAlign}")\n${captionLine}`);
        setNextImageCaption("");
      }
    } catch (uploadError) {
      showToast("error", uploadError instanceof Error ? uploadError.message : "Failed to upload image.");
    }
  }

  function addAttribute() {
    setDraftAttributes((current) => [...current, { key: "", value: "" }]);
  }

  function updateAttribute(index: number, field: "key" | "value", value: string) {
    setDraftAttributes((current) =>
      current.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute,
      ),
    );
  }

  function removeAttribute(index: number) {
    setDraftAttributes((current) => current.filter((_, attributeIndex) => attributeIndex !== index));
  }

  function beginEditing() {
    if (page) {
      loadDraftFromPage(page);
    }
    setIsEditing(true);
  }

  function cancelEditing() {
    if (isCreateMode) {
      history.push("/world-wiki");
      return;
    }
    if (page) {
      loadDraftFromPage(page);
    }
    setIsEditing(false);
  }

  async function handleSave() {
    if (!draftTitle.trim()) {
      showToast("error", "Title is required.");
      return;
    }

    const payload = {
      title: draftTitle.trim(),
      markdown: draftMarkdown,
      categoryId: draftCategoryId ? Number(draftCategoryId) : null,
      coverImagePath: draftCoverImagePath,
      attributes: draftAttributes.filter((attribute) => attribute.key.trim()),
      isDraft: draftIsDraft,
      gmOnly: draftGmOnly,
    };

    try {
      setIsSaving(true);

      const response = await fetch(
        isCreateMode
          ? `${authApiBaseUrl}/api/admin/world-wiki/pages`
          : `${authApiBaseUrl}/api/admin/world-wiki/pages/${slug}`,
        {
          method: isCreateMode ? "POST" : "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responsePayload.error || "Failed to save page.");
      }

      setPage(responsePayload.page);
      loadDraftFromPage(responsePayload.page);
      setIsEditing(false);
      showToast("success", "Page saved.");

      if (isCreateMode) {
        history.replace(`/world-wiki?slug=${encodeURIComponent(responsePayload.page.slug)}`);
      }
    } catch (saveError) {
      showToast("error", saveError instanceof Error ? saveError.message : "Failed to save page.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!page || isCreateMode) {
      return;
    }
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${authApiBaseUrl}/api/admin/world-wiki/pages/${slug}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete page.");
      }
      history.push("/world-wiki");
    } catch (deleteError) {
      showToast("error", deleteError instanceof Error ? deleteError.message : "Failed to delete page.");
    }
  }

  if (isLoading) {
    return <PageLoader label="Loading wiki page" />;
  }

  if (isCreateMode && !currentUser?.isStaff) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <Link to="/world-wiki" className={styles.backLink}>
            &larr; Back to World Wiki
          </Link>
          <p className={styles.error}>Only staff can create new wiki pages.</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <Link to="/world-wiki" className={styles.backLink}>
            &larr; Back to World Wiki
          </Link>
          <p className={styles.error}>That wiki page could not be found.</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return <PageLoader label="Loading wiki page" />;
  }

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {pendingCoverFile ? (
        <ImageCropDialog
          file={pendingCoverFile}
          onCancel={() => setPendingCoverFile(null)}
          onCropped={handleCoverImageCropped}
        />
      ) : null}
      <div className={styles.page}>
      <div className={styles.panel}>
      <Link to="/world-wiki" className={styles.backLink}>
        &larr; Back to World Wiki
      </Link>

      <div className={styles.statusRow}>
        <div />
        {currentUser?.isStaff && !isEditing ? (
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={beginEditing}>
              Edit Page
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <div className={styles.editorForm}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Title</span>
            <input
              className={styles.input}
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Category</span>
            <select
              className={styles.select}
              value={draftCategoryId}
              onChange={(event) => setDraftCategoryId(event.target.value)}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Cover Image</span>
            {draftCoverImagePath ? (
              <img
                src={draftCoverImagePath}
                alt="Cover"
                className={styles.imageUploadPreview}
              />
            ) : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
              >
                {isUploadingCover ? "Uploading..." : draftCoverImagePath ? "Replace Image" : "Add Image"}
              </button>
              {draftCoverImagePath ? (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => setDraftCoverImagePath(null)}
                >
                  Remove Image
                </button>
              ) : null}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={handleCoverImageSelected}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Attributes</span>
            <div className={styles.attributeList}>
              {draftAttributes.map((attribute, index) => (
                <div key={index} className={styles.attributeRow}>
                  <input
                    className={styles.input}
                    value={attribute.key}
                    onChange={(event) => updateAttribute(index, "key", event.target.value)}
                    placeholder="Key"
                  />
                  <input
                    className={styles.input}
                    value={attribute.value}
                    onChange={(event) => updateAttribute(index, "value", event.target.value)}
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    className={styles.attributeRemove}
                    onClick={() => removeAttribute(index)}
                    aria-label="Remove attribute"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className={styles.button} onClick={addAttribute}>
              + Add Attribute
            </button>
          </div>

          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={draftIsDraft}
              onChange={(event) => setDraftIsDraft(event.target.checked)}
            />
            <span>Draft (hidden from players)</span>
          </label>
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={draftGmOnly}
              onChange={(event) => setDraftGmOnly(event.target.checked)}
            />
            <span>GM Only (visible to staff and DMs only)</span>
          </label>

          <div className={styles.toolbar} aria-label="Markdown tools">
            <select
              className={styles.select}
              defaultValue=""
              onChange={(event) => {
                applyBlockType(event.target.value);
                event.target.value = "";
              }}
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
            <button className={styles.toolbarButton} type="button" onClick={() => formatInline("**", "**", "bold text")} title="Bold">
              <ToolbarIcon name="bold" className={styles.toolbarIcon} />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => formatInline("*", "*", "italic text")} title="Italic">
              <ToolbarIcon name="italic" className={styles.toolbarIcon} />
            </button>
            <button className={styles.toolbarButton} type="button" onClick={() => formatInline("`", "`", "code")} title="Inline code">
              <ToolbarIcon name="code" className={styles.toolbarIcon} />
            </button>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <button
              className={styles.toolbarButton}
              type="button"
              onClick={() =>
                replaceSelection(
                  (selectedText) => `[${selectedText}](https://example.com)`,
                  "[link text](https://example.com)",
                )
              }
              title="Link"
            >
              <ToolbarIcon name="link" className={styles.toolbarIcon} />
            </button>
            <button
              className={styles.toolbarButton}
              type="button"
              onClick={() => inlineImageInputRef.current?.click()}
              title="Insert image"
            >
              <ToolbarIcon name="image" className={styles.toolbarIcon} />
            </button>
            <select
              className={styles.select}
              value={nextImageSize}
              onChange={(event) => setNextImageSize(event.target.value as ImageSize)}
              aria-label="Next image size"
              title="Size for the next inserted image"
            >
              {IMAGE_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={nextImageAlign}
              onChange={(event) => setNextImageAlign(event.target.value as ImageAlign)}
              disabled={nextImageSize === "full"}
              aria-label="Next image placement"
              title="Placement for the next inserted image"
            >
              {IMAGE_ALIGN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className={styles.input}
              value={nextImageCaption}
              onChange={(event) => setNextImageCaption(event.target.value)}
              placeholder="Credit (optional)"
              aria-label="Credit for the next inserted image"
              title="Shown as a caption under the next inserted image"
              style={{ width: "9rem" }}
            />
            <button className={styles.toolbarButton} type="button" onClick={() => formatLines("- ", "List item")} title="Bulleted list">
              <ToolbarIcon name="list" className={styles.toolbarIcon} />
            </button>
            <button
              className={styles.toolbarButton}
              type="button"
              onClick={() =>
                replaceSelection(
                  (selectedText) =>
                    selectedText
                      .split("\n")
                      .map((line, lineIndex) => (line.trim() ? `${lineIndex + 1}. ${line}` : line))
                      .join("\n"),
                  "1. List item",
                )
              }
              title="Numbered list"
            >
              <ToolbarIcon name="orderedList" className={styles.toolbarIcon} />
            </button>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <button
              className={styles.toolbarButton}
              type="button"
              onClick={() => insert("\n| Column | Column |\n| --- | --- |\n| Value | Value |\n")}
              title="Table"
            >
              <ToolbarIcon name="table" className={styles.toolbarIcon} />
            </button>
            <input
              ref={inlineImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={handleInlineImageSelected}
            />
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

          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={cancelEditing} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Page"}
            </button>
          </div>

          <section className={styles.previewPanel}>
            <h2 className={styles.previewTitle}>Preview</h2>
            {renderedPreview}
          </section>
        </div>
      ) : (
        <div className={styles.articleLayout}>
          <div className={styles.articleMain}>
            <h1 className={styles.articleTitle}>{page.title}</h1>
            {page.isDraft || page.gmOnly ? (
              <div className={styles.badgeRow} style={{ marginBottom: "1rem" }}>
                {page.isDraft ? <span className={`${styles.badge} ${styles.badgeDraft}`}>Draft</span> : null}
                {page.gmOnly ? <span className={`${styles.badge} ${styles.badgeGmOnly}`}>GM Only</span> : null}
              </div>
            ) : null}
            <div className={styles.content}>{renderedMarkdown}</div>
          </div>
          <aside className={styles.sidebar}>
            {page.coverImagePath ? (
              <img src={page.coverImagePath} alt={page.title} className={styles.coverImage} />
            ) : null}
            {page.category ? (
              <div>
                <h2 className={styles.sidebarHeading}>Category</h2>
                <p className={styles.attributeValueLabel}>{page.category.name}</p>
              </div>
            ) : null}
            {page.attributes.length > 0 ? (
              <div>
                <h2 className={styles.sidebarHeading}>Details</h2>
                <div className={styles.attributeList}>
                  {page.attributes.map((attribute) => (
                    <div key={attribute.key} className={styles.attributeStatic}>
                      <span className={styles.attributeKeyLabel}>{attribute.key}</span>
                      <span className={styles.attributeValueLabel}>{attribute.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      )}
      </div>
      </div>
    </>
  );
}
