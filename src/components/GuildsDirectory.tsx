import { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import AvraeAliasBlock from "./AvraeAliasBlock";
import AvraeCommandBlock from "./AvraeCommandBlock";
import DirectorySidebarIndex from "./DirectorySidebarIndex";
import GuildEmblem from "./GuildEmblem";
import HomebrewAutomationSection from "./HomebrewAutomationSection";
import styles from "./GuildsDirectory.module.css";

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

type GuildAutomationEntry = {
  id: number;
  guildUpgradeId: number | null;
  panelTitle: string;
  panelSubtitle: string;
  setupCommands: AutomationSetupCommand[];
  codeBlocks: AutomationCodeBlock[];
};

type GuildUpgrade = {
  id: number;
  guildId: number;
  title: string;
  requirement: string;
  reward: string;
  details: string;
  sortOrder: number;
  automationEntries: GuildAutomationEntry[];
};

type Guild = {
  id: number;
  name: string;
  slug: string;
  emblemSrc: string | null;
  emblemAlt: string | null;
  summary: string;
  sortOrder: number;
  upgrades: GuildUpgrade[];
};

type GuildRoster = {
  guildName: string;
  memberCount: number;
  members: string[];
};

type SessionUser = {
  username: string;
  globalName: string | null;
  isStaff: boolean;
};

type GuildFormState = {
  name: string;
  slug: string;
  emblemSrc: string;
  emblemAlt: string;
  summary: string;
};

type UpgradeFormState = {
  title: string;
  requirement: string;
  reward: string;
  details: string;
  sortOrder: string;
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

function createEmptyGuildForm(): GuildFormState {
  return {
    name: "",
    slug: "",
    emblemSrc: "",
    emblemAlt: "",
    summary: "",
  };
}

function createEmptyUpgradeForm(): UpgradeFormState {
  return {
    title: "",
    requirement: "",
    reward: "",
    details: "",
    sortOrder: "0",
  };
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

function slugifyGuildName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function GuildsDirectory() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [collapsedGuilds, setCollapsedGuilds] = useState<
    Record<number, boolean>
  >({});
  const [openRosters, setOpenRosters] = useState<Record<number, boolean>>({});
  const [openGuildComposer, setOpenGuildComposer] = useState(false);
  const [editingGuildId, setEditingGuildId] = useState<number | null>(null);
  const [editingUpgradeId, setEditingUpgradeId] = useState<number | null>(null);
  const [openUpgradeGuildId, setOpenUpgradeGuildId] = useState<number | null>(
    null,
  );
  const [deletingGuildId, setDeletingGuildId] = useState<number | null>(null);
  const [deletingUpgradeId, setDeletingUpgradeId] = useState<number | null>(
    null,
  );
  const [openAutomationUpgradeId, setOpenAutomationUpgradeId] = useState<
    number | null
  >(null);
  const [editingAutomationEntryId, setEditingAutomationEntryId] = useState<
    number | null
  >(null);
  const [deletingAutomationEntryId, setDeletingAutomationEntryId] = useState<
    number | null
  >(null);
  const [isSubmittingGuild, setIsSubmittingGuild] = useState(false);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [isSubmittingAutomation, setIsSubmittingAutomation] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [guildRosters, setGuildRosters] = useState<GuildRoster[]>([]);
  const [guildRostersLoading, setGuildRostersLoading] = useState(true);
  const [guildRostersError, setGuildRostersError] = useState("");
  const [guildForm, setGuildForm] = useState<GuildFormState>(
    createEmptyGuildForm(),
  );
  const [upgradeForm, setUpgradeForm] = useState<UpgradeFormState>(
    createEmptyUpgradeForm(),
  );
  const [automationForm, setAutomationForm] = useState<AutomationFormState>({
    panelTitle: "Avrae Automation",
    panelSubtitle: "Expand to view setup and download options",
    setupCommands: [createEmptySetupCommandDraft()],
    codeBlocks: [createEmptyCodeBlockDraft()],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadGuilds() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${authApiBaseUrl}/api/guilds`);
        if (!response.ok) {
          throw new Error(`Failed to load guilds (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setGuilds(Array.isArray(payload.guilds) ? payload.guilds : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load guilds.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGuilds();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadGuildRosters() {
      try {
        setGuildRostersLoading(true);
        setGuildRostersError("");
        const response = await fetch(
          `${authApiBaseUrl}/api/rewards/westmarches/guild-rosters`,
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Failed to load guild rosters.");
        }

        const payload = await response.json();
        if (!cancelled) {
          setGuildRosters(
            Array.isArray(payload.rosters) ? payload.rosters : [],
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setGuildRosters([]);
          setGuildRostersError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load guild rosters.",
          );
        }
      } finally {
        if (!cancelled) {
          setGuildRostersLoading(false);
        }
      }
    }

    loadGuildRosters();
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

  const normalizedQuery = query.trim().toLowerCase();
  const isStaff = Boolean(currentUser?.isStaff);

  const visibleGuilds = useMemo(() => {
    if (!normalizedQuery) {
      return guilds;
    }

    return guilds.filter((guild) => {
      const haystack = [
        guild.name,
        guild.summary,
        ...guild.upgrades.flatMap((upgrade) => [
          upgrade.title,
          upgrade.requirement,
          upgrade.reward,
          upgrade.details,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [guilds, normalizedQuery]);
  const sidebarItems = useMemo(
    () =>
      visibleGuilds.map((guild) => ({
        id: `guild-${guild.slug}`,
        label: guild.name,
      })),
    [visibleGuilds],
  );

  useEffect(() => {
    if (!guilds.length) {
      return;
    }

    setCollapsedGuilds((current) => {
      const next = { ...current };

      for (const guild of guilds) {
        if (!(guild.id in next)) {
          next[guild.id] = true;
        }
      }

      return next;
    });
  }, [guilds]);

  function isGuildCollapsed(guildId: number) {
    return collapsedGuilds[guildId] ?? false;
  }

  function toggleGuildCollapsed(guildId: number) {
    setCollapsedGuilds((current) => ({
      ...current,
      [guildId]: !(current[guildId] ?? false),
    }));
  }

  function setAllGuildsCollapsed(collapsed: boolean) {
    setCollapsedGuilds(
      Object.fromEntries(guilds.map((guild) => [guild.id, collapsed])),
    );
  }

  function isRosterOpen(guildId: number) {
    return openRosters[guildId] ?? false;
  }

  function toggleRosterOpen(guildId: number) {
    setOpenRosters((current) => ({
      ...current,
      [guildId]: !(current[guildId] ?? false),
    }));
  }

  function resetGuildForm() {
    setGuildForm(createEmptyGuildForm());
    setEditingGuildId(null);
    setOpenGuildComposer(false);
  }

  function resetUpgradeForm() {
    setUpgradeForm(createEmptyUpgradeForm());
    setEditingUpgradeId(null);
    setOpenUpgradeGuildId(null);
  }

  function resetAutomationForm() {
    setAutomationForm({
      panelTitle: "Avrae Automation",
      panelSubtitle: "Expand to view setup and download options",
      setupCommands: [createEmptySetupCommandDraft()],
      codeBlocks: [createEmptyCodeBlockDraft()],
    });
    setEditingAutomationEntryId(null);
    setOpenAutomationUpgradeId(null);
  }

  function updateGuildField(field: keyof GuildFormState, value: string) {
    setGuildForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "name" && !editingGuildId && !current.slug.trim()) {
        next.slug = slugifyGuildName(value);
      }

      return next;
    });
  }

  function updateUpgradeField(field: keyof UpgradeFormState, value: string) {
    setUpgradeForm((current) => ({ ...current, [field]: value }));
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

  async function refreshGuilds() {
    const response = await fetch(`${authApiBaseUrl}/api/guilds`);
    if (!response.ok) {
      throw new Error(`Failed to load guilds (${response.status}).`);
    }
    const payload = await response.json();
    setGuilds(Array.isArray(payload.guilds) ? payload.guilds : []);
  }

  async function handleGuildSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = guildForm.name.trim();
    const slug = guildForm.slug.trim();

    if (!name || !slug) {
      setFormError("Guild name and slug are required.");
      setFormMessage("");
      return;
    }

    try {
      setIsSubmittingGuild(true);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        editingGuildId
          ? `${authApiBaseUrl}/api/admin/guilds/${editingGuildId}`
          : `${authApiBaseUrl}/api/admin/guilds`,
        {
          method: editingGuildId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name,
            slug,
            emblemSrc: guildForm.emblemSrc.trim(),
            emblemAlt: guildForm.emblemAlt.trim(),
            summary: guildForm.summary.trim(),
            sortOrder: editingGuildId
              ? guilds.find((guild) => guild.id === editingGuildId)
                  ?.sortOrder || 0
              : 0,
            isPublished: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save guild.");
      }

      await refreshGuilds();
      resetGuildForm();
      setFormMessage(editingGuildId ? "Guild updated." : "Guild created.");
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save guild.",
      );
      setFormMessage("");
    } finally {
      setIsSubmittingGuild(false);
    }
  }

  async function handleUpgradeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!openUpgradeGuildId || !upgradeForm.title.trim()) {
      setFormError("Upgrade title is required.");
      setFormMessage("");
      return;
    }

    try {
      setIsSubmittingUpgrade(true);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        editingUpgradeId
          ? `${authApiBaseUrl}/api/admin/guild-upgrades/${editingUpgradeId}`
          : `${authApiBaseUrl}/api/admin/guilds/${openUpgradeGuildId}/upgrades`,
        {
          method: editingUpgradeId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: upgradeForm.title.trim(),
            requirement: upgradeForm.requirement.trim(),
            reward: upgradeForm.reward.trim(),
            details: upgradeForm.details.trim(),
            sortOrder: Number.parseInt(upgradeForm.sortOrder, 10) || 0,
            isPublished: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save guild upgrade.");
      }

      await refreshGuilds();
      resetUpgradeForm();
      setFormMessage(
        editingUpgradeId ? "Guild upgrade updated." : "Guild upgrade created.",
      );
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save guild upgrade.",
      );
      setFormMessage("");
    } finally {
      setIsSubmittingUpgrade(false);
    }
  }

  async function handleDeleteGuild(guildId: number) {
    try {
      setDeletingGuildId(guildId);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/guilds/${guildId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete guild.");
      }

      await refreshGuilds();
      if (editingGuildId === guildId) {
        resetGuildForm();
      }
      setFormMessage("Guild removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete guild.",
      );
      setFormMessage("");
    } finally {
      setDeletingGuildId(null);
    }
  }

  async function handleDeleteUpgrade(upgradeId: number) {
    try {
      setDeletingUpgradeId(upgradeId);
      setFormError("");
      setFormMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/guild-upgrades/${upgradeId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete guild upgrade.");
      }

      await refreshGuilds();
      if (editingUpgradeId === upgradeId) {
        resetUpgradeForm();
      }
      setFormMessage("Guild upgrade removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete guild upgrade.",
      );
      setFormMessage("");
    } finally {
      setDeletingUpgradeId(null);
    }
  }

  async function handleAutomationSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!openAutomationUpgradeId) {
      setFormError("A guild upgrade must be selected.");
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
          ? `${authApiBaseUrl}/api/admin/guild-automation/${editingAutomationEntryId}`
          : `${authApiBaseUrl}/api/admin/guild-upgrades/${openAutomationUpgradeId}/automation`,
        {
          method: editingAutomationEntryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            guildUpgradeId: openAutomationUpgradeId,
            panelTitle: automationForm.panelTitle.trim(),
            panelSubtitle: automationForm.panelSubtitle.trim(),
            setupCommands,
            codeBlocks,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save guild automation.");
      }

      await refreshGuilds();
      resetAutomationForm();
      setFormMessage(
        editingAutomationEntryId
          ? "Guild automation updated."
          : "Guild automation created.",
      );
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save guild automation.",
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
        `${authApiBaseUrl}/api/admin/guild-automation/${automationEntryId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete guild automation.");
      }

      await refreshGuilds();
      if (editingAutomationEntryId === automationEntryId) {
        resetAutomationForm();
      }
      setFormMessage("Guild automation removed.");
    } catch (deleteError) {
      setFormError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete guild automation.",
      );
      setFormMessage("");
    } finally {
      setDeletingAutomationEntryId(null);
    }
  }

  function beginEditGuild(guild: Guild) {
    setGuildForm({
      name: guild.name,
      slug: guild.slug,
      emblemSrc: guild.emblemSrc || "",
      emblemAlt: guild.emblemAlt || "",
      summary: guild.summary,
    });
    setEditingGuildId(guild.id);
    setOpenGuildComposer(true);
    setFormError("");
    setFormMessage("");
  }

  function beginAddUpgrade(guildId: number) {
    setUpgradeForm(createEmptyUpgradeForm());
    setEditingUpgradeId(null);
    setOpenUpgradeGuildId(guildId);
    setFormError("");
    setFormMessage("");
  }

  function beginEditUpgrade(upgrade: GuildUpgrade) {
    setUpgradeForm({
      title: upgrade.title,
      requirement: upgrade.requirement,
      reward: upgrade.reward,
      details: upgrade.details,
      sortOrder: String(upgrade.sortOrder),
    });
    setEditingUpgradeId(upgrade.id);
    setOpenUpgradeGuildId(upgrade.guildId);
    setFormError("");
    setFormMessage("");
  }

  function beginAddAutomation(upgradeId: number) {
    resetAutomationForm();
    setOpenAutomationUpgradeId(upgradeId);
    setFormError("");
    setFormMessage("");
  }

  function beginEditAutomation(
    upgradeId: number,
    automationEntry: GuildAutomationEntry,
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
    setOpenAutomationUpgradeId(upgradeId);
    setFormError("");
    setFormMessage("");
  }

  function renderGuildComposer(
    submitLabel: string,
    resetLabel: string,
    onReset: () => void,
  ) {
    return (
      <form className={styles.composer} onSubmit={handleGuildSubmit}>
        <div className={styles.managerRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Guild Name</span>
            <input
              className={styles.input}
              value={guildForm.name}
              onChange={(event) => updateGuildField("name", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Slug</span>
            <input
              className={styles.input}
              value={guildForm.slug}
              onChange={(event) => updateGuildField("slug", event.target.value)}
            />
          </label>
        </div>
        <div className={styles.managerRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Emblem Source</span>
            <input
              className={styles.input}
              value={guildForm.emblemSrc}
              onChange={(event) =>
                updateGuildField("emblemSrc", event.target.value)
              }
              placeholder="/img/Golden%20Quill.webp"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Emblem Alt</span>
            <input
              className={styles.input}
              value={guildForm.emblemAlt}
              onChange={(event) =>
                updateGuildField("emblemAlt", event.target.value)
              }
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Summary</span>
          <textarea
            className={styles.textarea}
            value={guildForm.summary}
            onChange={(event) =>
              updateGuildField("summary", event.target.value)
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
            disabled={isSubmittingGuild}
          >
            {isSubmittingGuild
              ? editingGuildId
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
            <span className={styles.searchLabel}>Search guilds</span>
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by guild, requirement, reward, or keyword"
            />
          </label>
          <div className={styles.buttonRow}>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => setAllGuildsCollapsed(false)}
            >
              Expand all
            </button>
            <button
              className={styles.controlButton}
              type="button"
              onClick={() => setAllGuildsCollapsed(true)}
            >
              Collapse all
            </button>
            {isStaff ? (
              <button
                className={styles.controlButton}
                type="button"
                onClick={() => {
                  if (editingGuildId !== null || openGuildComposer) {
                    resetGuildForm();
                  } else {
                    setOpenGuildComposer(true);
                    setFormError("");
                    setFormMessage("");
                  }
                }}
              >
                {editingGuildId !== null || openGuildComposer
                  ? "Close Guild Editor"
                  : "Add Guild"}
              </button>
            ) : null}
          </div>
        </div>
        <p className={styles.searchHint}>
          Search filters by guild name, summary, upgrades, requirements, and
          rewards.
        </p>
        <p className={styles.count}>
          Showing {visibleGuilds.length} of {guilds.length} guilds.
        </p>
        {formMessage ? <p className={styles.message}>{formMessage}</p> : null}
        {formError ? <p className={styles.error}>{formError}</p> : null}
        {isStaff && openGuildComposer && editingGuildId === null
          ? renderGuildComposer("Add Guild", "Clear", resetGuildForm)
          : null}
      </div>
      <DirectorySidebarIndex items={sidebarItems} />

      {loading || authLoading ? <p>Loading guilds...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!loading && !error ? (
        <div className={styles.contentLayout}>
          <div className={styles.guildList}>
            {visibleGuilds.map((guild) => {
              const isEditingThisGuild = editingGuildId === guild.id;
              const isCollapsed =
                isGuildCollapsed(guild.id) && !isEditingThisGuild;
              const matchedRoster =
                guildRosters.find(
                  (roster) =>
                    roster.guildName.trim().toLowerCase() ===
                    guild.name.trim().toLowerCase(),
                ) || null;
              const rosterMembers = matchedRoster?.members || [];
              const rosterCount = matchedRoster?.memberCount || 0;
              const rosterOpen = isRosterOpen(guild.id);

              return (
                <article
                  id={`guild-${guild.slug}`}
                  className={`${styles.guildCard} ${
                    isCollapsed ? styles.guildCardCollapsed : ""
                  }`.trim()}
                  key={guild.id}
                >
                  <div className={styles.guildHeader}>
                    <button
                      className={styles.guildHeaderMain}
                      type="button"
                      onClick={() => toggleGuildCollapsed(guild.id)}
                    >
                      <GuildEmblem
                        src={guild.emblemSrc || ""}
                        alt={guild.emblemAlt || guild.name}
                        className={
                          isCollapsed ? "doc-section-kept-collapsed" : ""
                        }
                      />
                      <div className={styles.guildHeadingBlock}>
                        <h2 className={styles.guildHeading}>{guild.name}</h2>
                        {!isCollapsed &&
                        !isEditingThisGuild &&
                        guild.summary ? (
                          <p className={styles.guildSummary}>{guild.summary}</p>
                        ) : null}
                      </div>
                    </button>
                    {isStaff ? (
                      <div className={styles.guildActions}>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => toggleGuildCollapsed(guild.id)}
                        >
                          {isCollapsed ? "Open" : "Close"}
                        </button>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => beginEditGuild(guild)}
                        >
                          {isEditingThisGuild ? "Editing Guild" : "Edit Guild"}
                        </button>
                        <button
                          className={styles.inlineActionButton}
                          type="button"
                          onClick={() => beginAddUpgrade(guild.id)}
                        >
                          Add Upgrade
                        </button>
                        <button
                          className={styles.inlineDangerButton}
                          type="button"
                          onClick={() => handleDeleteGuild(guild.id)}
                          disabled={deletingGuildId === guild.id}
                        >
                          {deletingGuildId === guild.id
                            ? "Removing..."
                            : "Remove Guild"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {isCollapsed ? (
                    <p className={styles.collapseStatus}>
                      Guild collapsed. Use this heading or Expand all to show its details.
                    </p>
                  ) : null}
                  {isEditingThisGuild
                    ? renderGuildComposer(
                        "Save Guild",
                        "Cancel",
                        resetGuildForm,
                      )
                    : null}

                  {!isCollapsed &&
                  !isEditingThisGuild &&
                  isStaff &&
                  openUpgradeGuildId === guild.id ? (
                    <form
                      className={styles.upgradeComposer}
                      onSubmit={handleUpgradeSubmit}
                    >
                      <div className={styles.managerRow}>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>
                            Upgrade Title
                          </span>
                          <input
                            className={styles.input}
                            value={upgradeForm.title}
                            onChange={(event) =>
                              updateUpgradeField("title", event.target.value)
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Tier Order</span>
                          <input
                            className={styles.input}
                            type="number"
                            value={upgradeForm.sortOrder}
                            onChange={(event) =>
                              updateUpgradeField(
                                "sortOrder",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className={styles.managerRow}>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Requirement</span>
                          <textarea
                            className={styles.textarea}
                            value={upgradeForm.requirement}
                            onChange={(event) =>
                              updateUpgradeField(
                                "requirement",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>Reward</span>
                          <textarea
                            className={styles.textarea}
                            value={upgradeForm.reward}
                            onChange={(event) =>
                              updateUpgradeField("reward", event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Details</span>
                        <textarea
                          className={styles.textarea}
                          value={upgradeForm.details}
                          onChange={(event) =>
                            updateUpgradeField("details", event.target.value)
                          }
                        />
                      </label>
                      <div className={styles.formActions}>
                        <button
                          className={styles.secondaryButton}
                          type="button"
                          onClick={resetUpgradeForm}
                        >
                          Cancel
                        </button>
                        <button
                          className={styles.primaryButton}
                          type="submit"
                          disabled={isSubmittingUpgrade}
                        >
                          {isSubmittingUpgrade
                            ? editingUpgradeId
                              ? "Saving..."
                              : "Creating..."
                            : editingUpgradeId
                              ? "Save Upgrade"
                              : "Add Upgrade"}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {!isCollapsed && !isEditingThisGuild ? (
                    <div className={styles.guildContent}>
                      <section className={styles.rosterSection}>
                        <button
                          className={styles.rosterToggle}
                          type="button"
                          onClick={() => toggleRosterOpen(guild.id)}
                        >
                          <span className={styles.rosterToggleTitle}>
                            Guild Roster
                          </span>
                          <span className={styles.rosterToggleMeta}>
                            {guildRostersLoading
                              ? "Loading..."
                              : `${rosterCount} member${rosterCount === 1 ? "" : "s"}`}
                          </span>
                        </button>
                        {rosterOpen ? (
                          guildRostersError ? (
                            <p className={styles.rosterStatus}>
                              {guildRostersError}
                            </p>
                          ) : rosterMembers.length > 0 ? (
                            <div className={styles.rosterList}>
                              {rosterMembers.map((member) => (
                                <div
                                  key={`${guild.id}-${member}`}
                                  className={styles.rosterMember}
                                >
                                  {member}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className={styles.rosterStatus}>
                              No active guild members listed yet.
                            </p>
                          )
                        ) : null}
                      </section>
                      <div className={styles.upgradeList}>
                        {guild.upgrades.map((upgrade) => (
                          <section
                            className={styles.upgradeCard}
                            key={upgrade.id}
                          >
                            <div className={styles.upgradeHeader}>
                              <h3 className={styles.upgradeHeading}>
                                {upgrade.title}
                              </h3>
                              {isStaff ? (
                                <div className={styles.upgradeActions}>
                                  <button
                                    className={styles.inlineActionButton}
                                    type="button"
                                    onClick={() => beginEditUpgrade(upgrade)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className={styles.inlineActionButton}
                                    type="button"
                                    onClick={() =>
                                      beginAddAutomation(upgrade.id)
                                    }
                                  >
                                    {upgrade.automationEntries.length > 0
                                      ? "Add Automation"
                                      : "Add Automation"}
                                  </button>
                                  <button
                                    className={styles.inlineDangerButton}
                                    type="button"
                                    onClick={() =>
                                      handleDeleteUpgrade(upgrade.id)
                                    }
                                    disabled={deletingUpgradeId === upgrade.id}
                                  >
                                    {deletingUpgradeId === upgrade.id
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            <p className={styles.upgradeText}>
                              <strong>Requirement:</strong>{" "}
                              {upgrade.requirement}
                            </p>
                            <p className={styles.upgradeText}>
                              <strong>Reward:</strong> {upgrade.reward}
                            </p>
                            {upgrade.details ? (
                              <p className={styles.upgradeText}>
                                {upgrade.details}
                              </p>
                            ) : null}
                            {upgrade.automationEntries.map(
                              (automationEntry) => (
                                <div
                                  className={styles.automationBlock}
                                  key={automationEntry.id}
                                >
                                  <HomebrewAutomationSection
                                    title={automationEntry.panelTitle}
                                    subtitle={automationEntry.panelSubtitle}
                                  >
                                    {automationEntry.setupCommands.map(
                                      (command) => (
                                        <AvraeCommandBlock
                                          key={command.id}
                                          label={command.label}
                                          command={command.command}
                                        />
                                      ),
                                    )}
                                    {automationEntry.codeBlocks.map(
                                      (codeBlock) => (
                                        <AvraeAliasBlock
                                          key={codeBlock.id}
                                          title={codeBlock.title}
                                          code={codeBlock.code}
                                          downloadName={codeBlock.downloadName}
                                        />
                                      ),
                                    )}
                                  </HomebrewAutomationSection>
                                  {isStaff ? (
                                    <div className={styles.upgradeActions}>
                                      <button
                                        className={styles.inlineActionButton}
                                        type="button"
                                        onClick={() =>
                                          beginEditAutomation(
                                            upgrade.id,
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
                                          handleDeleteAutomation(
                                            automationEntry.id,
                                          )
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
                              ),
                            )}
                            {isStaff &&
                            openAutomationUpgradeId === upgrade.id ? (
                              <form
                                className={styles.upgradeComposer}
                                onSubmit={handleAutomationSubmit}
                              >
                                <div className={styles.managerRow}>
                                  <label className={styles.field}>
                                    <span className={styles.fieldLabel}>
                                      Panel Title
                                    </span>
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
                                </div>
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
                                        <span className={styles.fieldLabel}>
                                          Label
                                        </span>
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
                                        <span className={styles.fieldLabel}>
                                          Title
                                        </span>
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
                                        />
                                      </label>
                                      <div className={styles.formActions}>
                                        <button
                                          className={styles.secondaryButton}
                                          type="button"
                                          onClick={() =>
                                            removeCodeBlockDraft(draft.id)
                                          }
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
                          </section>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
            {!visibleGuilds.length ? (
              <p className={styles.emptyState}>
                No guilds match the current search.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
