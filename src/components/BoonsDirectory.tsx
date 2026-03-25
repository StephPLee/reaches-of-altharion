import React, { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import AvraeAliasBlock from "./AvraeAliasBlock";
import AvraeCommandBlock from "./AvraeCommandBlock";
import DirectorySidebarIndex from "./DirectorySidebarIndex";
import HomebrewAutomationSection from "./HomebrewAutomationSection";
import styles from "./BoonsDirectory.module.css";

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

type Boon = {
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

type BoonFormState = {
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

function slugifyBoonTitle(value: string) {
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

function createEmptyBoonForm(): BoonFormState {
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

function renderBoonContent(markdown: string) {
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

export default function BoonsDirectory() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [boons, setBoons] = useState<Boon[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [collapsedBoons, setCollapsedBoons] = useState<Record<number, boolean>>(
    {},
  );
  const [openBoonComposer, setOpenBoonComposer] = useState(false);
  const [editingBoonId, setEditingBoonId] = useState<number | null>(null);
  const [deletingBoonId, setDeletingBoonId] = useState<number | null>(null);
  const [openAutomationBoonId, setOpenAutomationBoonId] = useState<
    number | null
  >(null);
  const [editingAutomationEntryId, setEditingAutomationEntryId] = useState<
    number | null
  >(null);
  const [deletingAutomationEntryId, setDeletingAutomationEntryId] = useState<
    number | null
  >(null);
  const [isSubmittingBoon, setIsSubmittingBoon] = useState(false);
  const [isSubmittingAutomation, setIsSubmittingAutomation] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [boonForm, setBoonForm] = useState<BoonFormState>(
    createEmptyBoonForm(),
  );
  const [automationForm, setAutomationForm] = useState<AutomationFormState>({
    panelTitle: "Avrae Automation",
    panelSubtitle: "Expand to view setup and download options",
    setupCommands: [createEmptySetupCommandDraft()],
    codeBlocks: [createEmptyCodeBlockDraft()],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadBoons() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${authApiBaseUrl}/api/boons`);

        if (!response.ok) {
          throw new Error(`Failed to load boons (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setBoons(Array.isArray(payload.boons) ? payload.boons : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load boons.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBoons();
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
    if (!boons.length) {
      return;
    }

    setCollapsedBoons((current) => {
      const next = { ...current };
      for (const boon of boons) {
        if (!(boon.id in next)) {
          next[boon.id] = true;
        }
      }
      return next;
    });
  }, [boons]);

  const isStaff = Boolean(currentUser?.isStaff);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleBoons = useMemo(() => {
    if (!normalizedQuery) {
      return boons;
    }

    return boons.filter((boon) => {
      const haystack = [
        boon.title,
        boon.contentMarkdown,
        ...boon.automationEntries.flatMap((automationEntry) => [
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
  }, [boons, normalizedQuery]);

  const sidebarItems = useMemo(
    () =>
      visibleBoons.map((boon) => ({
        id: `boon-${boon.slug}`,
        label: boon.title,
      })),
    [visibleBoons],
  );

  function isBoonCollapsed(boonId: number) {
    return collapsedBoons[boonId] ?? true;
  }

  function toggleBoonCollapsed(boonId: number) {
    setCollapsedBoons((current) => ({
      ...current,
      [boonId]: !(current[boonId] ?? true),
    }));
  }

  function setAllBoonsCollapsed(collapsed: boolean) {
    setCollapsedBoons(
      Object.fromEntries(boons.map((boon) => [boon.id, collapsed])),
    );
  }

  function resetBoonForm() {
    setBoonForm(createEmptyBoonForm());
    setEditingBoonId(null);
    setOpenBoonComposer(false);
  }

  function resetAutomationForm() {
    setAutomationForm({
      panelTitle: "Avrae Automation",
      panelSubtitle: "Expand to view setup and download options",
      setupCommands: [createEmptySetupCommandDraft()],
      codeBlocks: [createEmptyCodeBlockDraft()],
    });
    setEditingAutomationEntryId(null);
    setOpenAutomationBoonId(null);
  }

  function updateBoonField(field: keyof BoonFormState, value: string) {
    setBoonForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "title" && !editingBoonId && !current.slug.trim()) {
        next.slug = slugifyBoonTitle(value);
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

  async function refreshBoons() {
    const response = await fetch(`${authApiBaseUrl}/api/boons`);
    if (!response.ok) {
      throw new Error(`Failed to load boons (${response.status}).`);
    }
    const payload = await response.json();
    setBoons(Array.isArray(payload.boons) ? payload.boons : []);
  }

  async function handleBoonSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = boonForm.title.trim();
    const slug = boonForm.slug.trim();

    if (!title || !slug || !boonForm.contentMarkdown.trim()) {
      setFormError("Title, slug, and content are required.");
      setFormMessage("");
      return;
    }

    try {
      setIsSubmittingBoon(true);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        editingBoonId
          ? `${authApiBaseUrl}/api/admin/boons/${editingBoonId}`
          : `${authApiBaseUrl}/api/admin/boons`,
        {
          method: editingBoonId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title,
            slug,
            contentMarkdown: boonForm.contentMarkdown,
            sortOrder: editingBoonId
              ? boons.find((boon) => boon.id === editingBoonId)?.sortOrder || 0
              : 0,
            isPublished: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save boon.");
      }

      await refreshBoons();
      resetBoonForm();
      setFormMessage(editingBoonId ? "Boon updated." : "Boon created.");
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save boon.",
      );
      setFormMessage("");
    } finally {
      setIsSubmittingBoon(false);
    }
  }

  async function handleDeleteBoon(boonId: number) {
    try {
      setDeletingBoonId(boonId);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/boons/${boonId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete boon.");
      }

      await refreshBoons();
      if (editingBoonId === boonId) {
        resetBoonForm();
      }
      setFormMessage("Boon removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete boon.",
      );
      setFormMessage("");
    } finally {
      setDeletingBoonId(null);
    }
  }

  async function handleAutomationSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!openAutomationBoonId) {
      setFormError("A boon must be selected.");
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
          ? `${authApiBaseUrl}/api/admin/boon-automation/${editingAutomationEntryId}`
          : `${authApiBaseUrl}/api/admin/boons/${openAutomationBoonId}/automation`,
        {
          method: editingAutomationEntryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            boonId: openAutomationBoonId,
            panelTitle: automationForm.panelTitle.trim(),
            panelSubtitle: automationForm.panelSubtitle.trim(),
            setupCommands,
            codeBlocks,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save boon automation.");
      }

      await refreshBoons();
      resetAutomationForm();
      setFormMessage(
        editingAutomationEntryId
          ? "Boon automation updated."
          : "Boon automation created.",
      );
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save boon automation.",
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
        `${authApiBaseUrl}/api/admin/boon-automation/${automationEntryId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete boon automation.");
      }

      await refreshBoons();
      if (editingAutomationEntryId === automationEntryId) {
        resetAutomationForm();
      }
      setFormMessage("Boon automation removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete boon automation.",
      );
      setFormMessage("");
    } finally {
      setDeletingAutomationEntryId(null);
    }
  }

  function beginEditBoon(boon: Boon) {
    setBoonForm({
      title: boon.title,
      slug: boon.slug,
      contentMarkdown: boon.contentMarkdown,
    });
    setEditingBoonId(boon.id);
    setOpenBoonComposer(true);
    setFormError("");
    setFormMessage("");
  }

  function beginAddAutomation(boonId: number) {
    resetAutomationForm();
    setOpenAutomationBoonId(boonId);
    setFormError("");
    setFormMessage("");
  }

  function beginEditAutomation(
    boonId: number,
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
    setOpenAutomationBoonId(boonId);
    setFormError("");
    setFormMessage("");
  }

  function renderBoonComposer(
    submitLabel: string,
    resetLabel: string,
    onReset: () => void,
  ) {
    return (
      <form className={styles.composer} onSubmit={handleBoonSubmit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Boon Title</span>
          <input
            className={styles.input}
            value={boonForm.title}
            onChange={(event) => updateBoonField("title", event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Slug</span>
          <input
            className={styles.input}
            value={boonForm.slug}
            onChange={(event) => updateBoonField("slug", event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Content</span>
          <textarea
            className={styles.textarea}
            value={boonForm.contentMarkdown}
            onChange={(event) =>
              updateBoonField("contentMarkdown", event.target.value)
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
            disabled={isSubmittingBoon}
          >
            {isSubmittingBoon
              ? editingBoonId
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
            <span className={styles.searchLabel}>Search boons</span>
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by boon name, feature, damage type, or keyword"
            />
          </label>
          <div className={styles.buttonRow}>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => setAllBoonsCollapsed(false)}
            >
              Expand all
            </button>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => setAllBoonsCollapsed(true)}
            >
              Collapse all
            </button>
            {isStaff ? (
              <button
                className={styles.controlButton}
                type="button"
                onClick={() => {
                  if (editingBoonId !== null || openBoonComposer) {
                    resetBoonForm();
                  } else {
                    setOpenBoonComposer(true);
                    setFormError("");
                    setFormMessage("");
                  }
                }}
              >
                {editingBoonId !== null || openBoonComposer
                  ? "Close Boon Editor"
                  : "Add Boon"}
              </button>
            ) : null}
          </div>
        </div>
        <p className={styles.searchHint}>
          Search filters by boon name, body text, setup commands, and
          automation.
        </p>
        <p className={styles.count}>
          Showing {visibleBoons.length} of {boons.length} boons.
        </p>
        {formMessage ? <p className={styles.message}>{formMessage}</p> : null}
        {formError ? <p className={styles.error}>{formError}</p> : null}
        {isStaff && openBoonComposer && editingBoonId === null
          ? renderBoonComposer("Add Boon", "Clear", resetBoonForm)
          : null}
      </div>
      <DirectorySidebarIndex items={sidebarItems} />

      {loading || authLoading ? <p>Loading boons...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!loading && !error ? (
        <div className={styles.contentLayout}>
          <div className={styles.boonList}>
            {visibleBoons.map((boon) => {
              const isEditingThisBoon = editingBoonId === boon.id;
              const isCollapsed =
                isBoonCollapsed(boon.id) && !isEditingThisBoon;

              return (
                <article
                  id={`boon-${boon.slug}`}
                  className={`${styles.boonCard} ${
                    isCollapsed ? styles.boonCardCollapsed : ""
                  }`.trim()}
                  key={boon.id}
                >
                  <div className={styles.boonHeader}>
                    <button
                      className={styles.boonHeaderMain}
                      type="button"
                      onClick={() => toggleBoonCollapsed(boon.id)}
                    >
                      <h2 className={styles.boonHeading}>{boon.title}</h2>
                    </button>
                    {isStaff ? (
                      <div className={styles.boonActions}>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => toggleBoonCollapsed(boon.id)}
                        >
                          {isCollapsed ? "Open" : "Close"}
                        </button>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => beginEditBoon(boon)}
                        >
                          {isEditingThisBoon ? "Editing Boon" : "Edit Boon"}
                        </button>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => beginAddAutomation(boon.id)}
                        >
                          Add Automation
                        </button>
                        <button
                          className={styles.inlineDangerButton}
                          type="button"
                          onClick={() => handleDeleteBoon(boon.id)}
                          disabled={deletingBoonId === boon.id}
                        >
                          {deletingBoonId === boon.id
                            ? "Removing..."
                            : "Remove Boon"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={
                      isCollapsed ? styles.boonBodyCollapsed : styles.boonBody
                    }
                  >
                    {isEditingThisBoon ? (
                      renderBoonComposer("Save Boon", "Cancel", resetBoonForm)
                    ) : (
                      <>
                        <div className={styles.content}>
                          {renderBoonContent(boon.contentMarkdown)}
                        </div>

                        {boon.automationEntries.map((automationEntry) => (
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
                                      boon.id,
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

                    {isStaff && openAutomationBoonId === boon.id ? (
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
            {!visibleBoons.length ? (
              <p className={styles.emptyState}>
                No boons match the current search.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
