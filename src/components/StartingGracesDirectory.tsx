import { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import AvraeAliasBlock from "./AvraeAliasBlock";
import AvraeCommandBlock from "./AvraeCommandBlock";
import DirectorySidebarIndex from "./DirectorySidebarIndex";
import HomebrewAutomationSection from "./HomebrewAutomationSection";
import styles from "./StartingGracesDirectory.module.css";

type AutomationSetupCommand = {
  id: number;
  label: string;
  command: string;
};

type AutomationCodeBlock = {
  id: number;
  title: string;
  code: string;
  downloadName: string;
};

type AutomationEntry = {
  id: number;
  panelTitle: string;
  panelSubtitle: string;
  setupCommands: AutomationSetupCommand[];
  codeBlocks: AutomationCodeBlock[];
};

type StartingGrace = {
  id: number;
  title: string;
  slug: string;
  contentMarkdown: string;
  sortOrder: number;
  automationEntries: AutomationEntry[];
};

type SessionUser = {
  isStaff: boolean;
};

type GraceFormState = {
  title: string;
  slug: string;
  contentMarkdown: string;
};

type SetupCommandDraft = {
  id: string;
  label: string;
  command: string;
};

type CodeBlockDraft = {
  id: string;
  title: string;
  code: string;
  downloadName: string;
};

type AutomationFormState = {
  panelTitle: string;
  panelSubtitle: string;
  setupCommands: SetupCommandDraft[];
  codeBlocks: CodeBlockDraft[];
};

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function slugifyGraceTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createDraftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptySetupCommandDraft(): SetupCommandDraft {
  return {
    id: createDraftId(),
    label: "Required CC",
    command: "",
  };
}

function createEmptyCodeBlockDraft(): CodeBlockDraft {
  return {
    id: createDraftId(),
    title: "",
    code: "",
    downloadName: "",
  };
}

function createEmptyGraceForm(): GraceFormState {
  return {
    title: "",
    slug: "",
    contentMarkdown: "",
  };
}

function renderInlineMarkdown(text: string) {
  const matches = text.matchAll(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const token = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={`${start}-strong`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={`${start}-em`}>{token.slice(1, -1)}</em>);
    }

    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

function renderGraceContent(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (!paragraphLines.length) {
      return;
    }

    nodes.push(
      <p key={`p-${nodes.length}`}>
        {renderInlineMarkdown(paragraphLines.join(" "))}
      </p>,
    );
    paragraphLines = [];
  }

  function flushList() {
    if (!listItems.length) {
      return;
    }

    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={`li-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2));
      continue;
    }

    if (listItems.length > 0) {
      const lastIndex = listItems.length - 1;
      listItems[lastIndex] = `${listItems[lastIndex]} ${line}`.trim();
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return nodes;
}

function mapSetupCommandToDraft(
  command: AutomationSetupCommand,
): SetupCommandDraft {
  return {
    id: createDraftId(),
    label: command.label,
    command: command.command,
  };
}

function mapCodeBlockToDraft(codeBlock: AutomationCodeBlock): CodeBlockDraft {
  return {
    id: createDraftId(),
    title: codeBlock.title,
    code: codeBlock.code,
    downloadName: codeBlock.downloadName,
  };
}

export default function StartingGracesDirectory() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [graces, setGraces] = useState<StartingGrace[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [collapsedGraces, setCollapsedGraces] = useState<
    Record<number, boolean>
  >({});
  const [openGraceComposer, setOpenGraceComposer] = useState(false);
  const [editingGraceId, setEditingGraceId] = useState<number | null>(null);
  const [deletingGraceId, setDeletingGraceId] = useState<number | null>(null);
  const [openAutomationGraceId, setOpenAutomationGraceId] = useState<
    number | null
  >(null);
  const [editingAutomationEntryId, setEditingAutomationEntryId] = useState<
    number | null
  >(null);
  const [deletingAutomationEntryId, setDeletingAutomationEntryId] = useState<
    number | null
  >(null);
  const [isSubmittingGrace, setIsSubmittingGrace] = useState(false);
  const [isSubmittingAutomation, setIsSubmittingAutomation] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [graceForm, setGraceForm] = useState<GraceFormState>(
    createEmptyGraceForm(),
  );
  const [automationForm, setAutomationForm] = useState<AutomationFormState>({
    panelTitle: "Avrae Automation",
    panelSubtitle: "Expand to view setup and download options",
    setupCommands: [createEmptySetupCommandDraft()],
    codeBlocks: [createEmptyCodeBlockDraft()],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadGraces() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${authApiBaseUrl}/api/starting-graces`);

        if (!response.ok) {
          throw new Error(
            `Failed to load starting graces (${response.status}).`,
          );
        }

        const payload = await response.json();
        if (!cancelled) {
          setGraces(Array.isArray(payload.graces) ? payload.graces : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load starting graces.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGraces();
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

  useEffect(() => {
    if (!graces.length) {
      return;
    }

    setCollapsedGraces((current) => {
      const next = { ...current };
      for (const grace of graces) {
        if (!(grace.id in next)) {
          next[grace.id] = true;
        }
      }
      return next;
    });
  }, [graces]);

  const isStaff = Boolean(currentUser?.isStaff);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGraces = useMemo(() => {
    if (!normalizedQuery) {
      return graces;
    }

    return graces.filter((grace) => {
      const haystack = [
        grace.title,
        grace.contentMarkdown,
        ...grace.automationEntries.flatMap((automationEntry) => [
          automationEntry.panelTitle,
          automationEntry.panelSubtitle,
          ...automationEntry.setupCommands.flatMap((command) => [
            command.label,
            command.command,
          ]),
          ...automationEntry.codeBlocks.flatMap((codeBlock) => [
            codeBlock.title,
            codeBlock.code,
          ]),
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [graces, normalizedQuery]);
  const sidebarItems = useMemo(
    () =>
      visibleGraces.map((grace) => ({
        id: `grace-${grace.slug}`,
        label: grace.title,
      })),
    [visibleGraces],
  );

  function isGraceCollapsed(graceId: number) {
    return collapsedGraces[graceId] ?? true;
  }

  function toggleGraceCollapsed(graceId: number) {
    setCollapsedGraces((current) => ({
      ...current,
      [graceId]: !(current[graceId] ?? true),
    }));
  }

  function setAllGracesCollapsed(collapsed: boolean) {
    setCollapsedGraces(
      Object.fromEntries(graces.map((grace) => [grace.id, collapsed])),
    );
  }

  function resetGraceForm() {
    setGraceForm(createEmptyGraceForm());
    setEditingGraceId(null);
    setOpenGraceComposer(false);
  }

  function resetAutomationForm() {
    setAutomationForm({
      panelTitle: "Avrae Automation",
      panelSubtitle: "Expand to view setup and download options",
      setupCommands: [createEmptySetupCommandDraft()],
      codeBlocks: [createEmptyCodeBlockDraft()],
    });
    setEditingAutomationEntryId(null);
    setOpenAutomationGraceId(null);
  }

  function updateGraceField(field: keyof GraceFormState, value: string) {
    setGraceForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "title" && !editingGraceId && !current.slug.trim()) {
        next.slug = slugifyGraceTitle(value);
      }

      return next;
    });
  }

  function updateAutomationField(
    field: "panelTitle" | "panelSubtitle",
    value: string,
  ) {
    setAutomationForm((current) => ({ ...current, [field]: value }));
  }

  function updateSetupCommandDraft(
    draftId: string,
    field: "label" | "command",
    value: string,
  ) {
    setAutomationForm((current) => ({
      ...current,
      setupCommands: current.setupCommands.map((draft) =>
        draft.id === draftId ? { ...draft, [field]: value } : draft,
      ),
    }));
  }

  function updateCodeBlockDraft(
    draftId: string,
    field: "title" | "code" | "downloadName",
    value: string,
  ) {
    setAutomationForm((current) => ({
      ...current,
      codeBlocks: current.codeBlocks.map((draft) =>
        draft.id === draftId ? { ...draft, [field]: value } : draft,
      ),
    }));
  }

  function addSetupCommandDraft() {
    setAutomationForm((current) => ({
      ...current,
      setupCommands: [...current.setupCommands, createEmptySetupCommandDraft()],
    }));
  }

  function addCodeBlockDraft() {
    setAutomationForm((current) => ({
      ...current,
      codeBlocks: [...current.codeBlocks, createEmptyCodeBlockDraft()],
    }));
  }

  function removeSetupCommandDraft(draftId: string) {
    setAutomationForm((current) => ({
      ...current,
      setupCommands:
        current.setupCommands.length > 1
          ? current.setupCommands.filter((draft) => draft.id !== draftId)
          : current.setupCommands,
    }));
  }

  function removeCodeBlockDraft(draftId: string) {
    setAutomationForm((current) => ({
      ...current,
      codeBlocks:
        current.codeBlocks.length > 1
          ? current.codeBlocks.filter((draft) => draft.id !== draftId)
          : current.codeBlocks,
    }));
  }

  async function refreshGraces() {
    const response = await fetch(`${authApiBaseUrl}/api/starting-graces`);
    if (!response.ok) {
      throw new Error(`Failed to load starting graces (${response.status}).`);
    }
    const payload = await response.json();
    setGraces(Array.isArray(payload.graces) ? payload.graces : []);
  }

  async function handleGraceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = graceForm.title.trim();
    const slug = graceForm.slug.trim();

    if (!title || !slug || !graceForm.contentMarkdown.trim()) {
      setFormError("Title, slug, and content are required.");
      setFormMessage("");
      return;
    }

    try {
      setIsSubmittingGrace(true);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        editingGraceId
          ? `${authApiBaseUrl}/api/admin/starting-graces/${editingGraceId}`
          : `${authApiBaseUrl}/api/admin/starting-graces`,
        {
          method: editingGraceId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title,
            slug,
            contentMarkdown: graceForm.contentMarkdown,
            sortOrder: editingGraceId
              ? graces.find((grace) => grace.id === editingGraceId)
                  ?.sortOrder || 0
              : 0,
            isPublished: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save starting grace.");
      }

      await refreshGraces();
      resetGraceForm();
      setFormMessage(
        editingGraceId ? "Starting grace updated." : "Starting grace created.",
      );
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save starting grace.",
      );
      setFormMessage("");
    } finally {
      setIsSubmittingGrace(false);
    }
  }

  async function handleDeleteGrace(graceId: number) {
    try {
      setDeletingGraceId(graceId);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/starting-graces/${graceId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete starting grace.");
      }

      await refreshGraces();
      if (editingGraceId === graceId) {
        resetGraceForm();
      }
      setFormMessage("Starting grace removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete starting grace.",
      );
      setFormMessage("");
    } finally {
      setDeletingGraceId(null);
    }
  }

  async function handleAutomationSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!openAutomationGraceId) {
      setFormError("A starting grace must be selected.");
      setFormMessage("");
      return;
    }

    const setupCommands = automationForm.setupCommands
      .filter((draft) => draft.command.trim())
      .map((draft) => ({
        label: draft.label.trim() || "Required CC",
        command: draft.command.trim(),
      }));

    const codeBlocks = automationForm.codeBlocks
      .filter((draft) => draft.title.trim() && draft.code.trim())
      .map((draft) => ({
        title: draft.title.trim(),
        code: draft.code,
        downloadName: draft.downloadName.trim(),
      }));

    if (setupCommands.length === 0 && codeBlocks.length === 0) {
      setFormError("Add at least one setup command or code block.");
      setFormMessage("");
      return;
    }

    try {
      setIsSubmittingAutomation(true);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        editingAutomationEntryId
          ? `${authApiBaseUrl}/api/admin/starting-grace-automation/${editingAutomationEntryId}`
          : `${authApiBaseUrl}/api/admin/starting-graces/${openAutomationGraceId}/automation`,
        {
          method: editingAutomationEntryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            startingGraceId: openAutomationGraceId,
            panelTitle: automationForm.panelTitle.trim(),
            panelSubtitle: automationForm.panelSubtitle.trim(),
            setupCommands,
            codeBlocks,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.error || "Failed to save starting grace automation.",
        );
      }

      await refreshGraces();
      resetAutomationForm();
      setFormMessage(
        editingAutomationEntryId
          ? "Starting grace automation updated."
          : "Starting grace automation created.",
      );
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save starting grace automation.",
      );
      setFormMessage("");
    } finally {
      setIsSubmittingAutomation(false);
    }
  }

  async function handleDeleteAutomation(automationEntryId: number) {
    try {
      setDeletingAutomationEntryId(automationEntryId);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/starting-grace-automation/${automationEntryId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error || "Failed to delete starting grace automation.",
        );
      }

      await refreshGraces();
      if (editingAutomationEntryId === automationEntryId) {
        resetAutomationForm();
      }
      setFormMessage("Starting grace automation removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete starting grace automation.",
      );
      setFormMessage("");
    } finally {
      setDeletingAutomationEntryId(null);
    }
  }

  function beginEditGrace(grace: StartingGrace) {
    setGraceForm({
      title: grace.title,
      slug: grace.slug,
      contentMarkdown: grace.contentMarkdown,
    });
    setEditingGraceId(grace.id);
    setOpenGraceComposer(true);
    setFormError("");
    setFormMessage("");
  }

  function beginAddAutomation(graceId: number) {
    resetAutomationForm();
    setOpenAutomationGraceId(graceId);
    setFormError("");
    setFormMessage("");
  }

  function beginEditAutomation(
    graceId: number,
    automationEntry: AutomationEntry,
  ) {
    setAutomationForm({
      panelTitle: automationEntry.panelTitle,
      panelSubtitle: automationEntry.panelSubtitle,
      setupCommands:
        automationEntry.setupCommands.length > 0
          ? automationEntry.setupCommands.map(mapSetupCommandToDraft)
          : [createEmptySetupCommandDraft()],
      codeBlocks:
        automationEntry.codeBlocks.length > 0
          ? automationEntry.codeBlocks.map(mapCodeBlockToDraft)
          : [createEmptyCodeBlockDraft()],
    });
    setEditingAutomationEntryId(automationEntry.id);
    setOpenAutomationGraceId(graceId);
    setFormError("");
    setFormMessage("");
  }

  function renderGraceComposer(
    submitLabel: string,
    resetLabel: string,
    onReset: () => void,
  ) {
    return (
      <form className={styles.composer} onSubmit={handleGraceSubmit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Grace Title</span>
          <input
            className={styles.input}
            value={graceForm.title}
            onChange={(event) => updateGraceField("title", event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Slug</span>
          <input
            className={styles.input}
            value={graceForm.slug}
            onChange={(event) => updateGraceField("slug", event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Content</span>
          <textarea
            className={styles.textarea}
            value={graceForm.contentMarkdown}
            onChange={(event) =>
              updateGraceField("contentMarkdown", event.target.value)
            }
          />
        </label>
        <div className={styles.formActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onReset}
          >
            {resetLabel}
          </button>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={isSubmittingGrace}
          >
            {isSubmittingGrace
              ? editingGraceId
                ? "Saving..."
                : "Creating..."
              : submitLabel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className={styles.shell}>
      <div className={styles.controlsPanel}>
        <div className={styles.controlsRow}>
          <label className={styles.searchField}>
            <span className={styles.searchLabel}>Search starting graces</span>
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by grace name, feature, level, or keyword"
            />
          </label>
          <div className={styles.buttonRow}>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => setAllGracesCollapsed(false)}
            >
              Expand all
            </button>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => setAllGracesCollapsed(true)}
            >
              Collapse all
            </button>
            {isStaff ? (
              <button
                className={styles.controlButton}
                type="button"
                onClick={() => {
                  if (editingGraceId !== null || openGraceComposer) {
                    resetGraceForm();
                  } else {
                    setOpenGraceComposer(true);
                    setFormError("");
                    setFormMessage("");
                  }
                }}
              >
                {editingGraceId !== null || openGraceComposer
                  ? "Close Grace Editor"
                  : "Add Grace"}
              </button>
            ) : null}
          </div>
        </div>
        <p className={styles.searchHint}>
          Search filters by grace name, body text, setup commands, and
          automation.
        </p>
        <p className={styles.count}>
          Showing {visibleGraces.length} of {graces.length} starting graces.
        </p>
        {formMessage ? <p className={styles.message}>{formMessage}</p> : null}
        {formError ? <p className={styles.error}>{formError}</p> : null}
        {isStaff && openGraceComposer && editingGraceId === null
          ? renderGraceComposer("Add Grace", "Clear", resetGraceForm)
          : null}
      </div>
      <DirectorySidebarIndex items={sidebarItems} />

      {loading || authLoading ? <p>Loading starting graces...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!loading && !error ? (
        <div className={styles.contentLayout}>
          <div className={styles.graceList}>
            {visibleGraces.map((grace) => {
              const isEditingThisGrace = editingGraceId === grace.id;
              const isCollapsed =
                isGraceCollapsed(grace.id) && !isEditingThisGrace;

              return (
                <article
                  id={`grace-${grace.slug}`}
                  className={`${styles.graceCard} ${
                    isCollapsed ? styles.graceCardCollapsed : ""
                  }`.trim()}
                  key={grace.id}
                >
                  <div className={styles.graceHeader}>
                    <button
                      className={styles.graceHeaderMain}
                      type="button"
                      onClick={() => toggleGraceCollapsed(grace.id)}
                    >
                      <h2 className={styles.graceHeading}>{grace.title}</h2>
                    </button>
                    {isStaff ? (
                      <div className={styles.graceActions}>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => toggleGraceCollapsed(grace.id)}
                        >
                          {isCollapsed ? "Open" : "Close"}
                        </button>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => beginEditGrace(grace)}
                        >
                          {isEditingThisGrace ? "Editing Grace" : "Edit Grace"}
                        </button>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => beginAddAutomation(grace.id)}
                        >
                          Add Automation
                        </button>
                        <button
                          className={styles.inlineDangerButton}
                          type="button"
                          onClick={() => handleDeleteGrace(grace.id)}
                          disabled={deletingGraceId === grace.id}
                        >
                          {deletingGraceId === grace.id
                            ? "Removing..."
                            : "Remove Grace"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={
                      isCollapsed ? styles.graceBodyCollapsed : styles.graceBody
                    }
                  >
                    {isEditingThisGrace ? (
                      renderGraceComposer(
                        "Save Grace",
                        "Cancel",
                        resetGraceForm,
                      )
                    ) : (
                      <>
                        <div className={styles.content}>
                          {renderGraceContent(grace.contentMarkdown)}
                        </div>

                        {grace.automationEntries.map((automationEntry) => (
                          <div
                            className={styles.automationBlock}
                            key={automationEntry.id}
                          >
                            <HomebrewAutomationSection
                              title={automationEntry.panelTitle}
                              subtitle={automationEntry.panelSubtitle}
                            >
                              {automationEntry.setupCommands.map((command) => (
                                <AvraeCommandBlock
                                  key={command.id}
                                  label={command.label}
                                  command={command.command}
                                />
                              ))}
                              {automationEntry.codeBlocks.map((codeBlock) => (
                                <AvraeAliasBlock
                                  key={codeBlock.id}
                                  title={codeBlock.title}
                                  code={codeBlock.code}
                                  downloadName={codeBlock.downloadName}
                                />
                              ))}
                            </HomebrewAutomationSection>
                            {isStaff ? (
                              <div className={styles.automationActions}>
                                <button
                                  className={styles.inlineActionButton}
                                  type="button"
                                  onClick={() =>
                                    beginEditAutomation(
                                      grace.id,
                                      automationEntry,
                                    )
                                  }
                                >
                                  Edit Automation
                                </button>
                                <button
                                  className={styles.inlineDangerButton}
                                  type="button"
                                  onClick={() =>
                                    handleDeleteAutomation(automationEntry.id)
                                  }
                                  disabled={
                                    deletingAutomationEntryId ===
                                    automationEntry.id
                                  }
                                >
                                  {deletingAutomationEntryId ===
                                  automationEntry.id
                                    ? "Removing..."
                                    : "Remove Automation"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </>
                    )}

                    {isStaff && openAutomationGraceId === grace.id ? (
                      <form
                        className={styles.automationComposer}
                        onSubmit={handleAutomationSubmit}
                      >
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Panel Title</span>
                          <input
                            className={styles.input}
                            value={automationForm.panelTitle}
                            onChange={(event) =>
                              updateAutomationField(
                                "panelTitle",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>
                            Panel Subtitle
                          </span>
                          <input
                            className={styles.input}
                            value={automationForm.panelSubtitle}
                            onChange={(event) =>
                              updateAutomationField(
                                "panelSubtitle",
                                event.target.value,
                              )
                            }
                          />
                        </label>

                        <div className={styles.automationGroup}>
                          <div className={styles.automationGroupHeader}>
                            <span className={styles.fieldLabel}>
                              Setup Commands
                            </span>
                            <button
                              className={styles.secondaryButton}
                              type="button"
                              onClick={addSetupCommandDraft}
                            >
                              Add Command
                            </button>
                          </div>
                          {automationForm.setupCommands.map((draft) => (
                            <div
                              className={styles.automationCard}
                              key={draft.id}
                            >
                              <label className={styles.field}>
                                <span className={styles.fieldLabel}>Label</span>
                                <input
                                  className={styles.input}
                                  value={draft.label}
                                  onChange={(event) =>
                                    updateSetupCommandDraft(
                                      draft.id,
                                      "label",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span className={styles.fieldLabel}>
                                  Command
                                </span>
                                <textarea
                                  className={styles.textarea}
                                  value={draft.command}
                                  onChange={(event) =>
                                    updateSetupCommandDraft(
                                      draft.id,
                                      "command",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <div className={styles.formActions}>
                                <button
                                  className={styles.secondaryButton}
                                  type="button"
                                  onClick={() =>
                                    removeSetupCommandDraft(draft.id)
                                  }
                                >
                                  Remove Command
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className={styles.automationGroup}>
                          <div className={styles.automationGroupHeader}>
                            <span className={styles.fieldLabel}>
                              Code Blocks
                            </span>
                            <button
                              className={styles.secondaryButton}
                              type="button"
                              onClick={addCodeBlockDraft}
                            >
                              Add Code Block
                            </button>
                          </div>
                          {automationForm.codeBlocks.map((draft) => (
                            <div
                              className={styles.automationCard}
                              key={draft.id}
                            >
                              <label className={styles.field}>
                                <span className={styles.fieldLabel}>Title</span>
                                <input
                                  className={styles.input}
                                  value={draft.title}
                                  onChange={(event) =>
                                    updateCodeBlockDraft(
                                      draft.id,
                                      "title",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span className={styles.fieldLabel}>
                                  Download Name
                                </span>
                                <input
                                  className={styles.input}
                                  value={draft.downloadName}
                                  onChange={(event) =>
                                    updateCodeBlockDraft(
                                      draft.id,
                                      "downloadName",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span className={styles.fieldLabel}>Code</span>
                                <textarea
                                  className={styles.textarea}
                                  value={draft.code}
                                  onChange={(event) =>
                                    updateCodeBlockDraft(
                                      draft.id,
                                      "code",
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>
                              <div className={styles.formActions}>
                                <button
                                  className={styles.secondaryButton}
                                  type="button"
                                  onClick={() => removeCodeBlockDraft(draft.id)}
                                >
                                  Remove Code Block
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className={styles.formActions}>
                          <button
                            className={styles.secondaryButton}
                            type="button"
                            onClick={resetAutomationForm}
                          >
                            Cancel
                          </button>
                          <button
                            className={styles.primaryButton}
                            type="submit"
                            disabled={isSubmittingAutomation}
                          >
                            {isSubmittingAutomation
                              ? editingAutomationEntryId
                                ? "Saving..."
                                : "Creating..."
                              : editingAutomationEntryId
                                ? "Save Automation"
                                : "Add Automation"}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {!visibleGraces.length ? (
              <p className={styles.emptyState}>
                No starting graces match the current search.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
