import { useEffect, useMemo, useState } from "react";
import Heading from "@theme/Heading";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import AvraeAliasBlock from "./AvraeAliasBlock";
import AvraeCommandBlock from "./AvraeCommandBlock";
import DirectorySidebarIndex from "./DirectorySidebarIndex";
import HomebrewAutomationSection from "./HomebrewAutomationSection";
import styles from "./SubclassesDirectory.module.css";

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
  homebrewSectionItemId?: number | null;
  panelTitle: string;
  panelSubtitle: string;
  setupCommands: AutomationSetupCommand[];
  codeBlocks: AutomationCodeBlock[];
};

type SectionItemLink = {
  label: string;
  href: string;
  id?: number;
  homebrewEntryId?: number;
  automationEntries?: AutomationEntry[];
};

type HomebrewEntry = {
  id: number;
  title: string;
  slug: string;
  bodyMarkdown: string;
  items?: SectionItemLink[];
  automationEntries: AutomationEntry[];
};

type SessionUser = {
  id?: number;
  username: string;
  globalName: string | null;
  isStaff: boolean;
};

type ItemFormState = {
  label: string;
  href: string;
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

type HomebrewSectionDirectoryProps = {
  section?: string;
  nounSingular?: string;
  nounPlural?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchHint?: string;
  emptyText?: string;
  linkPlaceholder?: string;
  linkOptional?: boolean;
};

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

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function parseBodyMarkdownLinks(value: string): SectionItemLink[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(.+?)\]\((https?:\/\/.+?)\)$/);

      if (!match) {
        return null;
      }

      return {
        label: match[1],
        href: match[2],
      };
    })
    .filter((item): item is SectionItemLink => Boolean(item));
}

function matchesQuery(
  section: { title: string; links: SectionItemLink[] },
  query: string,
) {
  if (!query) {
    return true;
  }

  const haystack = [
    section.title,
    ...section.links.flatMap((link) => [link.label, link.href]),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function mapEntriesToSections(entries: HomebrewEntry[]): Array<{
  id: number;
  slug: string;
  title: string;
  links: SectionItemLink[];
}> {
  return entries.map((entry) => ({
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    links: (entry.items ?? []).map((item) => ({
      ...item,
      homebrewEntryId: entry.id,
      automationEntries: item.automationEntries ?? [],
    })),
  }));
}

export default function SubclassesDirectory({
  section = "subclasses",
  nounSingular = "Subclass",
  nounPlural = "subclasses",
  searchLabel = "Search subclasses",
  searchPlaceholder = "Search by subclass name, class, feature, or keyword",
  searchHint = "Search filters by heading and linked subclass names.",
  emptyText = "No subclasses listed yet.",
  linkPlaceholder = "https://www.dndbeyond.com/subclasses/...",
  linkOptional = false,
}: HomebrewSectionDirectoryProps) {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [entries, setEntries] = useState<HomebrewEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [composerRestoreCollapse, setComposerRestoreCollapse] = useState<
    Record<number, boolean>
  >({});
  const [openComposerEntryId, setOpenComposerEntryId] = useState<number | null>(
    null,
  );
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutomationSubmitting, setIsAutomationSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [itemForm, setItemForm] = useState<ItemFormState>({
    label: "",
    href: "",
  });
  const [openAutomationItemId, setOpenAutomationItemId] = useState<
    number | null
  >(null);
  const [editingAutomationEntryId, setEditingAutomationEntryId] = useState<
    number | null
  >(null);
  const [deletingAutomationEntryId, setDeletingAutomationEntryId] = useState<
    number | null
  >(null);
  const [automationForm, setAutomationForm] = useState<AutomationFormState>({
    panelTitle: "Avrae Automation",
    panelSubtitle: "Expand to view setup and download options",
    setupCommands: [createEmptySetupCommandDraft()],
    codeBlocks: [createEmptyCodeBlockDraft()],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(
          `${authApiBaseUrl}/api/homebrew/${section}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${nounPlural} (${response.status}).`);
        }

        const payload = await response.json();

        if (!cancelled) {
          setEntries(Array.isArray(payload.entries) ? payload.entries : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : `Failed to load ${nounPlural}.`,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEntries();

    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, nounPlural, section]);

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

  const normalizedQuery = query.trim().toLowerCase();
  const sections = mapEntriesToSections(entries);
  const visibleSections = useMemo(
    () => sections.filter((section) => matchesQuery(section, normalizedQuery)),
    [normalizedQuery, sections],
  );
  const sidebarItems = useMemo(
    () =>
      visibleSections.map((section) => ({
        id: `section-${section.slug}`,
        label: section.title,
      })),
    [visibleSections],
  );
  const isStaff = Boolean(currentUser?.isStaff);

  function toggleSection(sectionTitle: string) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionTitle]: !(current[sectionTitle] ?? true),
    }));
  }

  function setAllSections(collapsed: boolean) {
    setCollapsedSections(
      Object.fromEntries(sections.map((section) => [section.title, collapsed])),
    );
  }

  function resetItemForm() {
    setItemForm({
      label: "",
      href: "",
    });
    setEditingItemId(null);
  }

  function updateItemField(field: keyof ItemFormState, value: string) {
    setItemForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetAutomationForm() {
    setAutomationForm({
      panelTitle: "Avrae Automation",
      panelSubtitle: "Expand to view setup and download options",
      setupCommands: [createEmptySetupCommandDraft()],
      codeBlocks: [createEmptyCodeBlockDraft()],
    });
    setEditingAutomationEntryId(null);
  }

  function updateAutomationField(
    field: "panelTitle" | "panelSubtitle",
    value: string,
  ) {
    setAutomationForm((current) => ({
      ...current,
      [field]: value,
    }));
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

  async function refreshEntries() {
    const response = await fetch(`${authApiBaseUrl}/api/homebrew/${section}`);

    if (!response.ok) {
      throw new Error(`Failed to load ${nounPlural} (${response.status}).`);
    }

    const payload = await response.json();
    setEntries(Array.isArray(payload.entries) ? payload.entries : []);
  }

  async function handleCreateItem(
    event: React.FormEvent<HTMLFormElement>,
    homebrewEntryId: number,
  ) {
    event.preventDefault();
    setFormMessage("");
    setFormError("");

    if (!itemForm.label.trim() || (!linkOptional && !itemForm.href.trim())) {
      setFormError(
        linkOptional ? "Name is required." : "Name and link are required.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const isEditing = editingItemId !== null;
      const response = await fetch(
        isEditing
          ? `${authApiBaseUrl}/api/admin/homebrew/items/${editingItemId}`
          : `${authApiBaseUrl}/api/admin/homebrew/items`,
        {
          method: isEditing ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? {
                  label: itemForm.label.trim(),
                  href: itemForm.href.trim(),
                }
              : {
                  homebrewEntryId,
                  label: itemForm.label.trim(),
                  href: itemForm.href.trim(),
                  sortOrder: 0,
                  isPublished: true,
                },
          ),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEditing
              ? `Failed to update ${nounSingular.toLowerCase()}.`
              : `Failed to create ${nounSingular.toLowerCase()}.`),
        );
      }

      await refreshEntries();
      resetItemForm();
      setFormMessage(
        isEditing ? `${nounSingular} updated.` : `${nounSingular} created.`,
      );
      setOpenComposerEntryId(null);
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : editingItemId !== null
            ? `Failed to update ${nounSingular.toLowerCase()}.`
            : `Failed to create ${nounSingular.toLowerCase()}.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function beginEditingItem(
    item: SectionItemLink,
    entryId: number,
    sectionTitle: string,
  ) {
    if (!item.id) {
      return;
    }

    setFormMessage("");
    setFormError("");
    setItemForm({
      label: item.label,
      href: item.href,
    });
    setEditingItemId(item.id);
    setComposerRestoreCollapse((previous) => ({
      ...previous,
      [entryId]: collapsedSections[sectionTitle] ?? true,
    }));
    setCollapsedSections((previous) => ({
      ...previous,
      [sectionTitle]: false,
    }));
    setOpenComposerEntryId(entryId);
  }

  async function handleDeleteItem(
    itemId: number | undefined,
    entryId: number,
    sectionTitle: string,
  ) {
    if (!itemId) {
      return;
    }

    setFormMessage("");
    setFormError("");

    try {
      setDeletingItemId(itemId);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/homebrew/items/${itemId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error || `Failed to delete ${nounSingular.toLowerCase()}.`,
        );
      }

      if (editingItemId === itemId) {
        resetItemForm();
        setOpenComposerEntryId(null);
        setCollapsedSections((previous) => ({
          ...previous,
          [sectionTitle]: composerRestoreCollapse[entryId] ?? false,
        }));
      }

      await refreshEntries();
      setFormMessage(`${nounSingular} removed.`);
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : `Failed to delete ${nounSingular.toLowerCase()}.`,
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handleCreateAutomation(item: SectionItemLink) {
    if (!item.id || !item.homebrewEntryId) {
      return;
    }

    setFormMessage("");
    setFormError("");

    try {
      setIsAutomationSubmitting(true);
      const response = await fetch(
        editingAutomationEntryId !== null
          ? `${authApiBaseUrl}/api/admin/homebrew/automation/${editingAutomationEntryId}`
          : `${authApiBaseUrl}/api/admin/homebrew/items/${item.id}/automation`,
        {
          method: editingAutomationEntryId !== null ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            homebrewEntryId: item.homebrewEntryId,
            homebrewSectionItemId: item.id,
            panelTitle: automationForm.panelTitle.trim(),
            panelSubtitle: automationForm.panelSubtitle.trim(),
            setupCommands: automationForm.setupCommands,
            codeBlocks: automationForm.codeBlocks,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create automation.");
      }

      await refreshEntries();
      resetAutomationForm();
      setOpenAutomationItemId(null);
      setFormMessage(
        editingAutomationEntryId !== null
          ? "Automation updated."
          : "Automation added.",
      );
    } catch (automationError) {
      setFormError(
        automationError instanceof Error
          ? automationError.message
          : editingAutomationEntryId !== null
            ? "Failed to update automation."
            : "Failed to create automation.",
      );
    } finally {
      setIsAutomationSubmitting(false);
    }
  }

  function beginEditingAutomation(
    item: SectionItemLink,
    automationEntry: AutomationEntry,
  ) {
    if (!item.id) {
      return;
    }

    setFormMessage("");
    setFormError("");
    setEditingAutomationEntryId(automationEntry.id);
    setOpenAutomationItemId(item.id);
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
  }

  async function handleDeleteAutomation(automationEntryId: number) {
    setFormMessage("");
    setFormError("");

    try {
      setDeletingAutomationEntryId(automationEntryId);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/homebrew/automation/${automationEntryId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete automation.");
      }

      if (editingAutomationEntryId === automationEntryId) {
        resetAutomationForm();
        setOpenAutomationItemId(null);
      }

      await refreshEntries();
      setFormMessage("Automation removed.");
    } catch (automationError) {
      setFormError(
        automationError instanceof Error
          ? automationError.message
          : "Failed to delete automation.",
      );
    } finally {
      setDeletingAutomationEntryId(null);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.controlsPanel}>
        <div className={styles.controlsRow}>
          <div className={styles.searchField}>
            <label className={styles.searchLabel} htmlFor="subclasses-search">
              {searchLabel}
            </label>
            <input
              id="subclasses-search"
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setAllSections(false)}
            >
              Expand all
            </button>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setAllSections(true)}
            >
              Collapse all
            </button>
          </div>
        </div>
        <p className={styles.searchHint}>{searchHint}</p>
        <p className={styles.count}>
          Showing {visibleSections.length} of {sections.length} {nounPlural}.
        </p>
      </div>
      <DirectorySidebarIndex items={sidebarItems} />

      {loading ? (
        <p className={styles.status}>Loading {nounPlural}...</p>
      ) : null}
      {!loading && error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.contentLayout}>
        <div className={styles.sectionList}>
          {visibleSections.map((section) => {
            const collapsed =
              !normalizedQuery && (collapsedSections[section.title] ?? true);
            const entry =
              entries.find((item) => item.title === section.title) ?? null;
            const entryItems = entry?.items ?? [];
            const sectionLinks =
              entryItems.length > 0 ? entryItems : section.links;

            return (
              <section
                id={`section-${section.slug}`}
                key={section.title}
                className={styles.section}
              >
                <Heading
                  as="h2"
                  className={styles.sectionHeading}
                  onClick={() => toggleSection(section.title)}
                >
                  <span>{section.title}</span>
                  <span className={styles.sectionHeaderActions}>
                    {isStaff && entry ? (
                      <button
                        type="button"
                        className={styles.headerActionButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          setFormMessage("");
                          setFormError("");
                          setOpenComposerEntryId((current) => {
                            if (current === entry.id) {
                              setCollapsedSections((previous) => ({
                                ...previous,
                                [section.title]:
                                  composerRestoreCollapse[entry.id] ?? false,
                              }));
                              setComposerRestoreCollapse((previous) => {
                                const next = { ...previous };
                                delete next[entry.id];
                                return next;
                              });
                              return null;
                            }

                            resetItemForm();
                            setComposerRestoreCollapse((previous) => ({
                              ...previous,
                              [entry.id]:
                                collapsedSections[section.title] ?? true,
                            }));
                            setCollapsedSections((previous) => ({
                              ...previous,
                              [section.title]: false,
                            }));
                            return entry.id;
                          });
                        }}
                      >
                        {openComposerEntryId === entry.id
                          ? "Close"
                          : `Add ${nounSingular}`}
                      </button>
                    ) : null}
                    <span
                      className={`${styles.sectionMeta} ${
                        section.links.length === 0
                          ? styles.sectionMetaEmpty
                          : ""
                      }`}
                    >
                      {section.links.length === 0
                        ? "Empty"
                        : `${section.links.length} item${section.links.length === 1 ? "" : "s"}`}
                    </span>
                  </span>
                </Heading>

                <div
                  className={`${styles.sectionBody} ${
                    collapsed ? styles.sectionBodyCollapsed : ""
                  }`}
                >
                  {isStaff && entry && openComposerEntryId === entry.id ? (
                    <form
                      className={styles.inlineComposer}
                      onSubmit={(event) => handleCreateItem(event, entry.id)}
                    >
                      <div className={styles.managerRow}>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>
                            {nounSingular} Name
                          </span>
                          <input
                            type="text"
                            className={styles.input}
                            value={itemForm.label}
                            onChange={(event) =>
                              updateItemField("label", event.target.value)
                            }
                            placeholder={`${nounSingular} name`}
                            required
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>
                            {linkOptional ? "Link (optional)" : "Link"}
                          </span>
                          <input
                            type="url"
                            className={styles.input}
                            value={itemForm.href}
                            onChange={(event) =>
                              updateItemField("href", event.target.value)
                            }
                            placeholder={linkPlaceholder}
                            required={!linkOptional}
                          />
                        </label>
                      </div>

                      {formMessage ? (
                        <p className={styles.success}>{formMessage}</p>
                      ) : null}
                      {formError ? (
                        <p className={styles.error}>{formError}</p>
                      ) : null}

                      <div className={styles.formActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={resetItemForm}
                        >
                          {editingItemId !== null ? "Cancel" : "Clear"}
                        </button>
                        <button
                          type="submit"
                          className={styles.primaryButton}
                          disabled={isSubmitting}
                        >
                          {isSubmitting
                            ? editingItemId !== null
                              ? "Saving..."
                              : "Adding..."
                            : editingItemId !== null
                              ? "Save Changes"
                              : `Add ${nounSingular}`}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {sectionLinks.length > 0 ? (
                    <div className={styles.linkList}>
                      {entryItems.length > 0
                        ? entryItems.map((link) => (
                            <div
                              key={`${link.id ?? link.href}-${link.label}`}
                              className={styles.linkBlock}
                            >
                              <div className={styles.linkRow}>
                                <p className={styles.linkLine}>
                                  {link.href ? (
                                    <a href={link.href}>{link.label}</a>
                                  ) : (
                                    <span>{link.label}</span>
                                  )}
                                </p>
                                {isStaff && entry && link.id ? (
                                  <div className={styles.linkActions}>
                                    <button
                                      type="button"
                                      className={styles.inlineActionButton}
                                      onClick={() =>
                                        beginEditingItem(
                                          link,
                                          entry.id,
                                          section.title,
                                        )
                                      }
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.inlineActionButton}
                                      onClick={() => {
                                        setFormMessage("");
                                        setFormError("");
                                        if (openAutomationItemId === link.id) {
                                          resetAutomationForm();
                                          setOpenAutomationItemId(null);
                                          return;
                                        }

                                        resetAutomationForm();
                                        setOpenAutomationItemId(
                                          link.id ?? null,
                                        );
                                      }}
                                    >
                                      {openAutomationItemId === link.id
                                        ? "Close Automation"
                                        : "Add Automation"}
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.inlineDangerButton}
                                      disabled={deletingItemId === link.id}
                                      onClick={() =>
                                        handleDeleteItem(
                                          link.id,
                                          entry.id,
                                          section.title,
                                        )
                                      }
                                    >
                                      {deletingItemId === link.id
                                        ? "Removing..."
                                        : "Remove"}
                                    </button>
                                  </div>
                                ) : null}
                              </div>

                              {(link.automationEntries ?? []).map(
                                (automationEntry) => (
                                  <div
                                    key={automationEntry.id}
                                    className={styles.automationBlock}
                                  >
                                    {isStaff && link.id ? (
                                      <div className={styles.automationActions}>
                                        <button
                                          type="button"
                                          className={styles.inlineActionButton}
                                          onClick={() =>
                                            beginEditingAutomation(
                                              link,
                                              automationEntry,
                                            )
                                          }
                                        >
                                          Edit Automation
                                        </button>
                                        <button
                                          type="button"
                                          className={styles.inlineDangerButton}
                                          disabled={
                                            deletingAutomationEntryId ===
                                            automationEntry.id
                                          }
                                          onClick={() =>
                                            handleDeleteAutomation(
                                              automationEntry.id,
                                            )
                                          }
                                        >
                                          {deletingAutomationEntryId ===
                                          automationEntry.id
                                            ? "Removing..."
                                            : "Remove Automation"}
                                        </button>
                                      </div>
                                    ) : null}

                                    <HomebrewAutomationSection
                                      title={automationEntry.panelTitle}
                                      subtitle={automationEntry.panelSubtitle}
                                    >
                                      {automationEntry.setupCommands.map(
                                        (setupCommand) => (
                                          <AvraeCommandBlock
                                            key={setupCommand.id}
                                            command={setupCommand.command}
                                            label={setupCommand.label}
                                          />
                                        ),
                                      )}
                                      {automationEntry.codeBlocks.map(
                                        (codeBlock) => (
                                          <AvraeAliasBlock
                                            key={codeBlock.id}
                                            title={codeBlock.title}
                                            code={codeBlock.code}
                                            downloadName={
                                              codeBlock.downloadName
                                            }
                                          />
                                        ),
                                      )}
                                    </HomebrewAutomationSection>
                                  </div>
                                ),
                              )}

                              {link.id && openAutomationItemId === link.id ? (
                                <div className={styles.automationComposer}>
                                  <div className={styles.managerRow}>
                                    <label className={styles.field}>
                                      <span className={styles.fieldLabel}>
                                        Panel Title
                                      </span>
                                      <input
                                        type="text"
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
                                        type="text"
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
                                  </div>

                                  <div className={styles.automationGroup}>
                                    <div
                                      className={styles.automationGroupHeader}
                                    >
                                      <span className={styles.fieldLabel}>
                                        Setup Commands / CC
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        onClick={addSetupCommandDraft}
                                      >
                                        Add CC
                                      </button>
                                    </div>
                                    {automationForm.setupCommands.map(
                                      (draft) => (
                                        <div
                                          key={draft.id}
                                          className={styles.automationCard}
                                        >
                                          <div className={styles.managerRow}>
                                            <label className={styles.field}>
                                              <span
                                                className={styles.fieldLabel}
                                              >
                                                Label
                                              </span>
                                              <input
                                                type="text"
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
                                              <span
                                                className={styles.fieldLabel}
                                              >
                                                Command
                                              </span>
                                              <input
                                                type="text"
                                                className={styles.input}
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
                                          </div>
                                          {automationForm.setupCommands.length >
                                          1 ? (
                                            <button
                                              type="button"
                                              className={styles.secondaryButton}
                                              onClick={() =>
                                                removeSetupCommandDraft(
                                                  draft.id,
                                                )
                                              }
                                            >
                                              Remove CC
                                            </button>
                                          ) : null}
                                        </div>
                                      ),
                                    )}
                                  </div>

                                  <div className={styles.automationGroup}>
                                    <div
                                      className={styles.automationGroupHeader}
                                    >
                                      <span className={styles.fieldLabel}>
                                        Code Blocks
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        onClick={addCodeBlockDraft}
                                      >
                                        Add Code Block
                                      </button>
                                    </div>
                                    {automationForm.codeBlocks.map((draft) => (
                                      <div
                                        key={draft.id}
                                        className={styles.automationCard}
                                      >
                                        <div className={styles.managerRow}>
                                          <label className={styles.field}>
                                            <span className={styles.fieldLabel}>
                                              Title
                                            </span>
                                            <input
                                              type="text"
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
                                              type="text"
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
                                        </div>
                                        <label className={styles.field}>
                                          <span className={styles.fieldLabel}>
                                            Code
                                          </span>
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
                                            rows={6}
                                          />
                                        </label>
                                        {automationForm.codeBlocks.length >
                                        1 ? (
                                          <button
                                            type="button"
                                            className={styles.secondaryButton}
                                            onClick={() =>
                                              removeCodeBlockDraft(draft.id)
                                            }
                                          >
                                            Remove Code Block
                                          </button>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>

                                  <div className={styles.formActions}>
                                    <button
                                      type="button"
                                      className={styles.secondaryButton}
                                      onClick={() => {
                                        resetAutomationForm();
                                        setOpenAutomationItemId(null);
                                      }}
                                    >
                                      {editingAutomationEntryId !== null
                                        ? "Cancel"
                                        : "Clear"}
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.primaryButton}
                                      disabled={isAutomationSubmitting}
                                      onClick={() =>
                                        handleCreateAutomation(link)
                                      }
                                    >
                                      {isAutomationSubmitting
                                        ? "Saving..."
                                        : editingAutomationEntryId !== null
                                          ? "Save Changes"
                                          : "Save Automation"}
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))
                        : section.links.map((link) => (
                            <div
                              key={`${link.href}-${link.label}`}
                              className={styles.linkRow}
                            >
                              <p className={styles.linkLine}>
                                {link.href ? (
                                  <a href={link.href}>{link.label}</a>
                                ) : (
                                  <span>{link.label}</span>
                                )}
                              </p>
                            </div>
                          ))}
                    </div>
                  ) : (
                    <p className={styles.fallbackText}>{emptyText}</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
