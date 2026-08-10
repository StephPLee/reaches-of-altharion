import React, { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import AvraeAliasBlock from "./AvraeAliasBlock";
import AvraeCommandBlock from "./AvraeCommandBlock";
import HomebrewAutomationSection from "./HomebrewAutomationSection";
import styles from "./CapstonesDirectory.module.css";

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

type Capstone = {
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

type CapstoneFormState = {
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

function slugifyCapstoneTitle(value: string) {
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

function createEmptyCapstoneForm(): CapstoneFormState {
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

function renderCapstoneContent(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (!paragraphLines.length) {
      return;
    }

    const text = paragraphLines.join(" ").trim();
    const isFlavorText = /^\*[^*].*[^*]\*$/.test(text);
    nodes.push(
      <p
        className={isFlavorText ? styles.flavorText : undefined}
        key={`p-${nodes.length}`}
      >
        {renderInlineMarkdown(isFlavorText ? text.slice(1, -1).trim() : text)}
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

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      nodes.push(
        <h3 key={`h3-${nodes.length}`}>
          {renderInlineMarkdown(line.slice(4))}
        </h3>,
      );
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

export default function CapstonesDirectory() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [capstones, setCapstones] = useState<Capstone[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [collapsedCapstones, setCollapsedCapstones] = useState<
    Record<number, boolean>
  >({});
  const [openCapstoneComposer, setOpenCapstoneComposer] = useState(false);
  const [editingCapstoneId, setEditingCapstoneId] = useState<number | null>(
    null,
  );
  const [deletingCapstoneId, setDeletingCapstoneId] = useState<number | null>(
    null,
  );
  const [openAutomationCapstoneId, setOpenAutomationCapstoneId] = useState<
    number | null
  >(null);
  const [editingAutomationEntryId, setEditingAutomationEntryId] = useState<
    number | null
  >(null);
  const [deletingAutomationEntryId, setDeletingAutomationEntryId] = useState<
    number | null
  >(null);
  const [isSubmittingCapstone, setIsSubmittingCapstone] = useState(false);
  const [isSubmittingAutomation, setIsSubmittingAutomation] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [capstoneForm, setCapstoneForm] = useState<CapstoneFormState>(
    createEmptyCapstoneForm(),
  );
  const [automationForm, setAutomationForm] = useState<AutomationFormState>({
    panelTitle: "Avrae Automation",
    panelSubtitle: "Expand to view setup and download options",
    setupCommands: [createEmptySetupCommandDraft()],
    codeBlocks: [createEmptyCodeBlockDraft()],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCapstones() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${authApiBaseUrl}/api/capstones`);

        if (!response.ok) {
          throw new Error(`Failed to load capstones (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setCapstones(Array.isArray(payload.capstones) ? payload.capstones : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load capstones.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCapstones();
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
    if (!capstones.length) {
      return;
    }

    setCollapsedCapstones((current) => {
      const next = { ...current };
      for (const capstone of capstones) {
        if (!(capstone.id in next)) {
          next[capstone.id] = true;
        }
      }
      return next;
    });
  }, [capstones]);

  const isStaff = Boolean(currentUser?.isStaff);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCapstones = useMemo(() => {
    if (!normalizedQuery) {
      return capstones;
    }

    return capstones.filter((capstone) => {
      const haystack = [
        capstone.title,
        capstone.contentMarkdown,
        ...capstone.automationEntries.flatMap((automationEntry) => [
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
  }, [capstones, normalizedQuery]);

  function isCapstoneCollapsed(capstoneId: number) {
    return collapsedCapstones[capstoneId] ?? true;
  }

  function toggleCapstoneCollapsed(capstoneId: number) {
    setCollapsedCapstones((current) => ({
      ...current,
      [capstoneId]: !(current[capstoneId] ?? true),
    }));
  }

  function setAllCapstonesCollapsed(collapsed: boolean) {
    setCollapsedCapstones(
      Object.fromEntries(capstones.map((capstone) => [capstone.id, collapsed])),
    );
  }

  function resetCapstoneForm() {
    setCapstoneForm(createEmptyCapstoneForm());
    setEditingCapstoneId(null);
    setOpenCapstoneComposer(false);
  }

  function resetAutomationForm() {
    setAutomationForm({
      panelTitle: "Avrae Automation",
      panelSubtitle: "Expand to view setup and download options",
      setupCommands: [createEmptySetupCommandDraft()],
      codeBlocks: [createEmptyCodeBlockDraft()],
    });
    setEditingAutomationEntryId(null);
    setOpenAutomationCapstoneId(null);
  }

  function updateCapstoneField(field: keyof CapstoneFormState, value: string) {
    setCapstoneForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "title" && !editingCapstoneId && !current.slug.trim()) {
        next.slug = slugifyCapstoneTitle(value);
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

  async function refreshCapstones() {
    const response = await fetch(`${authApiBaseUrl}/api/capstones`);
    if (!response.ok) {
      throw new Error(`Failed to load capstones (${response.status}).`);
    }
    const payload = await response.json();
    setCapstones(Array.isArray(payload.capstones) ? payload.capstones : []);
  }

  async function handleCapstoneSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const title = capstoneForm.title.trim();
    const slug = capstoneForm.slug.trim();

    if (!title || !slug || !capstoneForm.contentMarkdown.trim()) {
      setFormError("Title, slug, and content are required.");
      setFormMessage("");
      return;
    }

    try {
      setIsSubmittingCapstone(true);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        editingCapstoneId
          ? `${authApiBaseUrl}/api/admin/capstones/${editingCapstoneId}`
          : `${authApiBaseUrl}/api/admin/capstones`,
        {
          method: editingCapstoneId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title,
            slug,
            contentMarkdown: capstoneForm.contentMarkdown,
            sortOrder: editingCapstoneId
              ? capstones.find((capstone) => capstone.id === editingCapstoneId)
                  ?.sortOrder || 0
              : 0,
            isPublished: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save capstone.");
      }

      await refreshCapstones();
      resetCapstoneForm();
      setFormMessage(editingCapstoneId ? "Capstone updated." : "Capstone created.");
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save capstone.",
      );
      setFormMessage("");
    } finally {
      setIsSubmittingCapstone(false);
    }
  }

  async function handleDeleteCapstone(capstoneId: number) {
    try {
      setDeletingCapstoneId(capstoneId);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/capstones/${capstoneId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete capstone.");
      }

      await refreshCapstones();
      if (editingCapstoneId === capstoneId) {
        resetCapstoneForm();
      }
      setFormMessage("Capstone removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete capstone.",
      );
      setFormMessage("");
    } finally {
      setDeletingCapstoneId(null);
    }
  }

  async function handleAutomationSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!openAutomationCapstoneId) {
      setFormError("A capstone must be selected.");
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
          ? `${authApiBaseUrl}/api/admin/capstone-automation/${editingAutomationEntryId}`
          : `${authApiBaseUrl}/api/admin/capstones/${openAutomationCapstoneId}/automation`,
        {
          method: editingAutomationEntryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            capstoneId: openAutomationCapstoneId,
            panelTitle: automationForm.panelTitle.trim(),
            panelSubtitle: automationForm.panelSubtitle.trim(),
            setupCommands,
            codeBlocks,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save capstone automation.");
      }

      await refreshCapstones();
      resetAutomationForm();
      setFormMessage(
        editingAutomationEntryId
          ? "Capstone automation updated."
          : "Capstone automation created.",
      );
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save capstone automation.",
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
        `${authApiBaseUrl}/api/admin/capstone-automation/${automationEntryId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete capstone automation.");
      }

      await refreshCapstones();
      if (editingAutomationEntryId === automationEntryId) {
        resetAutomationForm();
      }
      setFormMessage("Capstone automation removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete capstone automation.",
      );
      setFormMessage("");
    } finally {
      setDeletingAutomationEntryId(null);
    }
  }

  function beginEditCapstone(capstone: Capstone) {
    setCapstoneForm({
      title: capstone.title,
      slug: capstone.slug,
      contentMarkdown: capstone.contentMarkdown,
    });
    setEditingCapstoneId(capstone.id);
    setOpenCapstoneComposer(true);
    setFormError("");
    setFormMessage("");
  }

  function beginAddAutomation(capstoneId: number) {
    resetAutomationForm();
    setOpenAutomationCapstoneId(capstoneId);
    setFormError("");
    setFormMessage("");
  }

  function beginEditAutomation(
    capstoneId: number,
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
    setOpenAutomationCapstoneId(capstoneId);
    setFormError("");
    setFormMessage("");
  }

  function renderCapstoneComposer(
    submitLabel: string,
    resetLabel: string,
    onReset: () => void,
  ) {
    return (
      <form className={styles.composer} onSubmit={handleCapstoneSubmit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Capstone Title</span>
          <input
            className={styles.input}
            value={capstoneForm.title}
            onChange={(event) =>
              updateCapstoneField("title", event.target.value)
            }
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Slug</span>
          <input
            className={styles.input}
            value={capstoneForm.slug}
            onChange={(event) =>
              updateCapstoneField("slug", event.target.value)
            }
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Content</span>
          <textarea
            className={styles.textarea}
            value={capstoneForm.contentMarkdown}
            onChange={(event) =>
              updateCapstoneField("contentMarkdown", event.target.value)
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
            disabled={isSubmittingCapstone}
          >
            {isSubmittingCapstone
              ? editingCapstoneId
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
            <span className={styles.searchLabel}>Search capstones</span>
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by class name, feature, or keyword"
            />
          </label>
          <div className={styles.buttonRow}>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => setAllCapstonesCollapsed(false)}
            >
              Expand all
            </button>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => setAllCapstonesCollapsed(true)}
            >
              Collapse all
            </button>
            {isStaff ? (
              <button
                className={styles.controlButton}
                type="button"
                onClick={() => {
                  if (editingCapstoneId !== null || openCapstoneComposer) {
                    resetCapstoneForm();
                  } else {
                    setOpenCapstoneComposer(true);
                    setFormError("");
                    setFormMessage("");
                  }
                }}
              >
                {editingCapstoneId !== null || openCapstoneComposer
                  ? "Close Capstone Editor"
                  : "Add Capstone"}
              </button>
            ) : null}
          </div>
        </div>

        <p className={styles.count}>
          Showing {visibleCapstones.length} of {capstones.length} capstones.
        </p>
        {formMessage ? <p className={styles.message}>{formMessage}</p> : null}
        {formError ? <p className={styles.error}>{formError}</p> : null}
        {isStaff && openCapstoneComposer && editingCapstoneId === null
          ? renderCapstoneComposer("Add Capstone", "Clear", resetCapstoneForm)
          : null}
      </div>

      {loading || authLoading ? <p>Loading capstones...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!loading && !error ? (
        <div className={styles.contentLayout}>
          <div className={styles.capstoneList}>
            {visibleCapstones.map((capstone) => {
              const isEditingThisCapstone = editingCapstoneId === capstone.id;
              const isCollapsed =
                isCapstoneCollapsed(capstone.id) && !isEditingThisCapstone;

              return (
                <article
                  id={`capstone-${capstone.slug}`}
                  className={`${styles.capstoneCard} ${
                    isCollapsed ? styles.capstoneCardCollapsed : ""
                  }`.trim()}
                  key={capstone.id}
                >
                  <div className={styles.capstoneHeader}>
                    <button
                      className={styles.capstoneHeaderMain}
                      type="button"
                      onClick={() => toggleCapstoneCollapsed(capstone.id)}
                    >
                      <h2 className={styles.capstoneHeading}>
                        {capstone.title}
                      </h2>
                    </button>
                    {isStaff ? (
                      <div className={styles.capstoneActions}>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => toggleCapstoneCollapsed(capstone.id)}
                        >
                          {isCollapsed ? "Open" : "Close"}
                        </button>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => beginEditCapstone(capstone)}
                        >
                          {isEditingThisCapstone
                            ? "Editing Capstone"
                            : "Edit Capstone"}
                        </button>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => beginAddAutomation(capstone.id)}
                        >
                          Add Automation
                        </button>
                        <button
                          className={styles.inlineDangerButton}
                          type="button"
                          onClick={() => handleDeleteCapstone(capstone.id)}
                          disabled={deletingCapstoneId === capstone.id}
                        >
                          {deletingCapstoneId === capstone.id
                            ? "Removing..."
                            : "Remove Capstone"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={
                      isCollapsed
                        ? styles.capstoneBodyCollapsed
                        : styles.capstoneBody
                    }
                    hidden={isCollapsed}
                  >
                    {isEditingThisCapstone ? (
                      renderCapstoneComposer(
                        "Save Capstone",
                        "Cancel",
                        resetCapstoneForm,
                      )
                    ) : (
                      <>
                        <div className={styles.content}>
                          {renderCapstoneContent(capstone.contentMarkdown)}
                        </div>

                        {capstone.automationEntries.map((automationEntry) => (
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
                                      capstone.id,
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

                    {isStaff && openAutomationCapstoneId === capstone.id ? (
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
            {!visibleCapstones.length ? (
              <p className={styles.emptyState}>
                No capstones match the current search.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
