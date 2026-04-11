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
  panelTitle: string;
  panelSubtitle: string;
  setupCommands: AutomationSetupCommand[];
  codeBlocks: AutomationCodeBlock[];
};

type SpeciesItem = {
  id: number;
  homebrewEntryId: number;
  parentItemId: number | null;
  label: string;
  href: string;
  automationEntries?: AutomationEntry[];
  children?: SpeciesItem[];
};

type SpeciesEntry = {
  id: number;
  title: string;
  items: SpeciesItem[];
};

type SessionUser = {
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

type SingleSectionDirectoryProps = {
  section?: string;
  nounSingular?: string;
  nounPlural?: string;
  addRootLabel?: string;
  addChildLabel?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchHint?: string;
  emptyText?: string;
  linkPlaceholder?: string;
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

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function flattenItems(items: SpeciesItem[]): SpeciesItem[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children ?? [])]);
}

export default function SpeciesDirectory({
  section = "species",
  nounSingular = "Species",
  nounPlural = "species",
  addRootLabel = "Add Species",
  addChildLabel = "Add Variant",
  searchLabel = "Search species",
  searchPlaceholder = "Search by species name, trait, feature, or keyword",
  searchHint = "Search filters by species and variant names.",
  emptyText = "No species listed yet.",
  linkPlaceholder = "https://www.dndbeyond.com/species/...",
}: SingleSectionDirectoryProps) {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [entry, setEntry] = useState<SpeciesEntry | null>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(true);
  const [openComposerParentItemId, setOpenComposerParentItemId] = useState<
    number | null
  >(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [openAutomationItemId, setOpenAutomationItemId] = useState<
    number | null
  >(null);
  const [editingAutomationEntryId, setEditingAutomationEntryId] = useState<
    number | null
  >(null);
  const [deletingAutomationEntryId, setDeletingAutomationEntryId] = useState<
    number | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutomationSubmitting, setIsAutomationSubmitting] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>({
    label: "",
    href: "",
  });
  const [automationForm, setAutomationForm] = useState<AutomationFormState>({
    panelTitle: "Avrae Automation",
    panelSubtitle: "Expand to view setup and download options",
    setupCommands: [createEmptySetupCommandDraft()],
    codeBlocks: [createEmptyCodeBlockDraft()],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSpecies() {
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
          setEntry(
            Array.isArray(payload.entries)
              ? (payload.entries[0] ?? null)
              : null,
          );
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

    loadSpecies();

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

  const isStaff = Boolean(currentUser?.isStaff);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    if (!entry) {
      return [];
    }

    if (!normalizedQuery) {
      return entry.items;
    }

    function filterItems(items: SpeciesItem[]): SpeciesItem[] {
      return items
        .map((item) => {
          const filteredChildren = filterItems(item.children ?? []);
          const haystack = [item.label, item.href].join(" ").toLowerCase();
          const isMatch = haystack.includes(normalizedQuery);

          if (!isMatch && filteredChildren.length === 0) {
            return null;
          }

          return {
            ...item,
            children: filteredChildren,
          };
        })
        .filter(Boolean) as SpeciesItem[];
    }

    return filterItems(entry.items);
  }, [entry, normalizedQuery]);
  const sidebarItems = useMemo(
    () =>
      visibleItems.map((item) => ({
        id: `item-${item.id}`,
        label: item.label,
      })),
    [visibleItems],
  );

  function resetItemForm() {
    setItemForm({ label: "", href: "" });
    setEditingItemId(null);
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

  async function refreshSpecies() {
    const response = await fetch(`${authApiBaseUrl}/api/homebrew/${section}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${nounPlural} (${response.status}).`);
    }

    const payload = await response.json();
    setEntry(
      Array.isArray(payload.entries) ? (payload.entries[0] ?? null) : null,
    );
  }

  async function handleSaveItem(
    event: React.FormEvent<HTMLFormElement>,
    parentItemId: number | null,
  ) {
    event.preventDefault();
    setFormError("");
    setFormMessage("");

    if (!entry || !itemForm.label.trim()) {
      setFormError("Name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(
        editingItemId !== null
          ? `${authApiBaseUrl}/api/admin/homebrew/items/${editingItemId}`
          : `${authApiBaseUrl}/api/admin/homebrew/items`,
        {
          method: editingItemId !== null ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            editingItemId !== null
              ? {
                  parentItemId,
                  label: itemForm.label.trim(),
                  href: itemForm.href.trim(),
                }
              : {
                  homebrewEntryId: entry.id,
                  parentItemId,
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
            `Failed to save ${nounSingular.toLowerCase()} entry.`,
        );
      }

      await refreshSpecies();
      resetItemForm();
      setOpenComposerParentItemId(null);
      setFormMessage(
        editingItemId !== null
          ? `${nounSingular} updated.`
          : `${nounSingular} added.`,
      );
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : `Failed to save ${nounSingular.toLowerCase()} entry.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteItem(itemId: number | undefined) {
    if (!itemId) {
      return;
    }

    setFormError("");
    setFormMessage("");

    try {
      setDeletingItemId(itemId);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/homebrew/items/${itemId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.error ||
            `Failed to delete ${nounSingular.toLowerCase()} entry.`,
        );
      }

      await refreshSpecies();
      if (editingItemId === itemId) {
        resetItemForm();
        setOpenComposerParentItemId(null);
      }
      setFormMessage(`${nounSingular} removed.`);
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : `Failed to delete ${nounSingular.toLowerCase()} entry.`,
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handleSaveAutomation(item: SpeciesItem) {
    setFormError("");
    setFormMessage("");

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
        throw new Error(payload.error || "Failed to save automation.");
      }

      await refreshSpecies();
      resetAutomationForm();
      setOpenAutomationItemId(null);
      setFormMessage(
        editingAutomationEntryId !== null
          ? "Automation updated."
          : "Automation added.",
      );
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save automation.",
      );
    } finally {
      setIsAutomationSubmitting(false);
    }
  }

  async function handleDeleteAutomation(automationEntryId: number) {
    setFormError("");
    setFormMessage("");

    try {
      setDeletingAutomationEntryId(automationEntryId);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/homebrew/automation/${automationEntryId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete automation.");
      }

      await refreshSpecies();
      if (editingAutomationEntryId === automationEntryId) {
        resetAutomationForm();
        setOpenAutomationItemId(null);
      }
      setFormMessage("Automation removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete automation.",
      );
    } finally {
      setDeletingAutomationEntryId(null);
    }
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

  function beginEdit(item: SpeciesItem) {
    setFormError("");
    setFormMessage("");
    setEditingItemId(item.id);
    setOpenComposerParentItemId(item.parentItemId ?? null);
    setItemForm({
      label: item.label,
      href: item.href,
    });
  }

  function beginEditAutomation(
    item: SpeciesItem,
    automationEntry: AutomationEntry,
  ) {
    setEditingAutomationEntryId(automationEntry.id);
    setOpenAutomationItemId(item.id);
    setAutomationForm({
      panelTitle: automationEntry.panelTitle,
      panelSubtitle: automationEntry.panelSubtitle,
      setupCommands:
        automationEntry.setupCommands.length > 0
          ? automationEntry.setupCommands.map((command) => ({
              id: createDraftId(),
              label: command.label,
              command: command.command,
            }))
          : [createEmptySetupCommandDraft()],
      codeBlocks:
        automationEntry.codeBlocks.length > 0
          ? automationEntry.codeBlocks.map((codeBlock) => ({
              id: createDraftId(),
              title: codeBlock.title,
              code: codeBlock.code,
              downloadName: codeBlock.downloadName,
            }))
          : [createEmptyCodeBlockDraft()],
    });
  }

  function renderComposer(parentItemId: number | null) {
    if (!entry || !isStaff || openComposerParentItemId !== parentItemId) {
      return null;
    }

    return (
      <form
        className={styles.inlineComposer}
        onSubmit={(event) => handleSaveItem(event, parentItemId)}
      >
        <div className={styles.managerRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{nounSingular} Name</span>
            <input
              type="text"
              className={styles.input}
              value={itemForm.label}
              onChange={(event) =>
                setItemForm((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
              placeholder={`${nounSingular} name`}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Link (optional)</span>
            <input
              type="url"
              className={styles.input}
              value={itemForm.href}
              onChange={(event) =>
                setItemForm((current) => ({
                  ...current,
                  href: event.target.value,
                }))
              }
              placeholder={linkPlaceholder}
            />
          </label>
        </div>
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              resetItemForm();
              setOpenComposerParentItemId(null);
            }}
          >
            {editingItemId !== null ? "Cancel" : "Clear"}
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : editingItemId !== null
                ? "Save Changes"
                : parentItemId === null
                  ? addRootLabel
                  : addChildLabel}
          </button>
        </div>
      </form>
    );
  }

  function renderAutomationComposer(item: SpeciesItem) {
    if (openAutomationItemId !== item.id) {
      return null;
    }

    return (
      <div className={styles.automationComposer}>
        <div className={styles.managerRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Panel Title</span>
            <input
              type="text"
              className={styles.input}
              value={automationForm.panelTitle}
              onChange={(event) =>
                setAutomationForm((current) => ({
                  ...current,
                  panelTitle: event.target.value,
                }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Panel Subtitle</span>
            <input
              type="text"
              className={styles.input}
              value={automationForm.panelSubtitle}
              onChange={(event) =>
                setAutomationForm((current) => ({
                  ...current,
                  panelSubtitle: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className={styles.automationGroup}>
          <div className={styles.automationGroupHeader}>
            <span className={styles.fieldLabel}>Setup Commands / CC</span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={addSetupCommandDraft}
            >
              Add CC
            </button>
          </div>
          {automationForm.setupCommands.map((draft) => (
            <div key={draft.id} className={styles.automationCard}>
              <div className={styles.managerRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Label</span>
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
                  <span className={styles.fieldLabel}>Command</span>
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
              {automationForm.setupCommands.length > 1 ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => removeSetupCommandDraft(draft.id)}
                >
                  Remove CC
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <div className={styles.automationGroup}>
          <div className={styles.automationGroupHeader}>
            <span className={styles.fieldLabel}>Code Blocks</span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={addCodeBlockDraft}
            >
              Add Code Block
            </button>
          </div>
          {automationForm.codeBlocks.map((draft) => (
            <div key={draft.id} className={styles.automationCard}>
              <div className={styles.managerRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Title</span>
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
                  <span className={styles.fieldLabel}>Download Name</span>
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
                <span className={styles.fieldLabel}>Code</span>
                <textarea
                  className={styles.textarea}
                  value={draft.code}
                  onChange={(event) =>
                    updateCodeBlockDraft(draft.id, "code", event.target.value)
                  }
                  rows={6}
                />
              </label>
              {automationForm.codeBlocks.length > 1 ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => removeCodeBlockDraft(draft.id)}
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
            {editingAutomationEntryId !== null ? "Cancel" : "Clear"}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={isAutomationSubmitting}
            onClick={() => handleSaveAutomation(item)}
          >
            {isAutomationSubmitting
              ? "Saving..."
              : editingAutomationEntryId !== null
                ? "Save Changes"
                : "Save Automation"}
          </button>
        </div>
      </div>
    );
  }

  function renderItems(items: SpeciesItem[], depth = 0): React.ReactNode {
    return items.map((item) => (
      <div
        id={depth === 0 ? `item-${item.id}` : undefined}
        key={`${item.id}-${depth}`}
        className={depth > 0 ? styles.nestedLinkBlock : styles.linkBlock}
      >
        <div className={styles.linkRow}>
          <p className={styles.linkLine}>
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span>{item.label}</span>
            )}
          </p>
          {isStaff ? (
            <div className={styles.linkActions}>
              <button
                type="button"
                className={styles.inlineActionButton}
                onClick={() => beginEdit(item)}
              >
                Edit
              </button>
              <button
                type="button"
                className={styles.inlineActionButton}
                onClick={() => {
                  resetItemForm();
                  setOpenComposerParentItemId(item.id);
                }}
              >
                {addChildLabel}
              </button>
              <button
                type="button"
                className={styles.inlineActionButton}
                onClick={() => {
                  resetAutomationForm();
                  setOpenAutomationItemId((current) =>
                    current === item.id ? null : item.id,
                  );
                }}
              >
                {openAutomationItemId === item.id
                  ? "Close Automation"
                  : "Add Automation"}
              </button>
              <button
                type="button"
                className={styles.inlineDangerButton}
                disabled={deletingItemId === item.id}
                onClick={() => handleDeleteItem(item.id)}
              >
                {deletingItemId === item.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ) : null}
        </div>

        {(item.automationEntries ?? []).map((automationEntry) => (
          <div key={automationEntry.id} className={styles.automationBlock}>
            {isStaff ? (
              <div className={styles.automationActions}>
                <button
                  type="button"
                  className={styles.inlineActionButton}
                  onClick={() => beginEditAutomation(item, automationEntry)}
                >
                  Edit Automation
                </button>
                <button
                  type="button"
                  className={styles.inlineDangerButton}
                  disabled={deletingAutomationEntryId === automationEntry.id}
                  onClick={() => handleDeleteAutomation(automationEntry.id)}
                >
                  {deletingAutomationEntryId === automationEntry.id
                    ? "Removing..."
                    : "Remove Automation"}
                </button>
              </div>
            ) : null}
            <HomebrewAutomationSection
              title={automationEntry.panelTitle}
              subtitle={automationEntry.panelSubtitle}
            >
              {automationEntry.setupCommands.map((setupCommand) => (
                <AvraeCommandBlock
                  key={setupCommand.id}
                  command={setupCommand.command}
                  label={setupCommand.label}
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
          </div>
        ))}

        {renderAutomationComposer(item)}
        {renderComposer(item.id)}

        {(item.children ?? []).length > 0 ? (
          <div className={styles.nestedLinkList}>
            {renderItems(item.children ?? [], depth + 1)}
          </div>
        ) : null}
      </div>
    ));
  }

  const totalCount = entry ? entry.items.length : 0;
  const isCollapsed = !normalizedQuery && isSectionCollapsed;

  return (
    <div className={styles.shell}>
      <div className={styles.controlsPanel}>
        <div className={styles.controlsRow}>
          <label className={`${styles.field} ${styles.searchField}`}>
            <span className={styles.searchLabel}>{searchLabel}</span>
            <input
              type="search"
              className={styles.searchInput}
              value={query}
              placeholder={searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setIsSectionCollapsed(false)}
            >
              Expand all
            </button>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setIsSectionCollapsed(true)}
            >
              Collapse all
            </button>
          </div>
        </div>
        <p className={styles.searchHint}>{searchHint}</p>
        <p className={styles.count}>Showing 1 section.</p>
      </div>
      <DirectorySidebarIndex items={sidebarItems} />

      {loading ? (
        <p className={styles.status}>Loading {nounPlural}...</p>
      ) : null}
      {authLoading ? (
        <p className={styles.status}>Checking session...</p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {formError ? <p className={styles.error}>{formError}</p> : null}
      {formMessage ? <p className={styles.success}>{formMessage}</p> : null}

      {entry ? (
        <div className={styles.contentLayout}>
          <section className={styles.section}>
            <Heading
              as="h2"
              className={styles.sectionHeading}
              onClick={() => setIsSectionCollapsed((current) => !current)}
            >
              <span>{entry.title}</span>
              <span className={styles.sectionHeaderActions}>
                {isStaff ? (
                  <button
                    type="button"
                    className={styles.headerActionButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      resetItemForm();
                      setOpenComposerParentItemId((current) =>
                        current === null ? -1 : null,
                      );
                      setIsSectionCollapsed(false);
                    }}
                  >
                    {openComposerParentItemId === -1 ? "Close" : addRootLabel}
                  </button>
                ) : null}
                <span
                  className={`${styles.sectionMeta} ${
                    totalCount === 0 ? styles.sectionMetaEmpty : ""
                  }`}
                >
                  {totalCount === 0
                    ? "Empty"
                    : `${totalCount} item${totalCount === 1 ? "" : "s"}`}
                </span>
              </span>
            </Heading>

            <div
              className={`${styles.sectionBody} ${
                isCollapsed ? styles.sectionBodyCollapsed : ""
              }`}
              hidden={isCollapsed}
            >
              {isStaff && openComposerParentItemId === -1
                ? renderComposer(null)
                : null}
              {visibleItems.length > 0 ? (
                <div className={styles.linkList}>
                  {renderItems(visibleItems)}
                </div>
              ) : (
                <p className={styles.fallbackText}>{emptyText}</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
