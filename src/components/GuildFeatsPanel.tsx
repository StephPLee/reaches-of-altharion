import { useState } from "react";
import styles from "./GuildsDirectory.module.css";

export type GuildFeatItem = {
  id: number;
  label: string;
  href: string;
  sortOrder: number;
};

export type GuildFeatEntry = {
  id: number;
  slug: string;
  items: GuildFeatItem[];
};

type GuildFeatsPanelProps = {
  authApiBaseUrl: string;
  isStaff: boolean;
  guild: { name: string; slug: string; sortOrder: number };
  entry: GuildFeatEntry | null;
  onChanged: () => Promise<void>;
};

export function guildFeatsSlug(guildSlug: string) {
  return `guild-feats-${guildSlug}`;
}

// Collapsible list of a guild's bonus feats. They're stored as a homebrew list
// (section "guild-feats"), which is also mirrored to the Discord guild feats post.
export default function GuildFeatsPanel({
  authApiBaseUrl,
  isStaff,
  guild,
  entry,
  onChanged,
}: GuildFeatsPanelProps) {
  const [open, setOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const feats = entry?.items ?? [];

  function resetComposer() {
    setComposerOpen(false);
    setEditingItemId(null);
    setLabel("");
    setHref("");
    setError("");
  }

  function beginEdit(item: GuildFeatItem) {
    setComposerOpen(true);
    setEditingItemId(item.id);
    setLabel(item.label);
    setHref(item.href || "");
    setError("");
  }

  async function sendJson(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Request failed.");
    }
    return payload;
  }

  // Guilds added after the seed have no feat list yet; create it on first use.
  async function ensureEntryId() {
    if (entry) {
      return entry.id;
    }
    const payload = await sendJson(
      `${authApiBaseUrl}/api/admin/homebrew/entries`,
      "POST",
      {
        section: "guild-feats",
        title: guild.name,
        slug: guildFeatsSlug(guild.slug),
        bodyMarkdown: "",
        sortOrder: guild.sortOrder,
        isPublished: true,
      },
    );
    return payload.entry.id as number;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) {
      setError("Feat name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      if (editingItemId !== null) {
        await sendJson(
          `${authApiBaseUrl}/api/admin/homebrew/items/${editingItemId}`,
          "PATCH",
          { label: label.trim(), href: href.trim() },
        );
      } else {
        const homebrewEntryId = await ensureEntryId();
        // New feats go after the existing ones so tier order is kept.
        const nextSortOrder =
          feats.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 10;
        await sendJson(`${authApiBaseUrl}/api/admin/homebrew/items`, "POST", {
          homebrewEntryId,
          label: label.trim(),
          href: href.trim(),
          sortOrder: nextSortOrder,
          isPublished: true,
        });
      }

      await onChanged();
      resetComposer();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save feat.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(item: GuildFeatItem) {
    if (!window.confirm(`Remove ${item.label} from ${guild.name}?`)) {
      return;
    }

    try {
      setError("");
      await sendJson(
        `${authApiBaseUrl}/api/admin/homebrew/items/${item.id}`,
        "DELETE",
      );
      await onChanged();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove feat.",
      );
    }
  }

  return (
    <section className={styles.rosterSection}>
      <button
        className={styles.rosterToggle}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.rosterToggleTitle}>Guild Feats</span>
        <span className={styles.rosterToggleMeta}>
          {`${feats.length} feat${feats.length === 1 ? "" : "s"}`}
        </span>
      </button>

      {open ? (
        <>
          {feats.length > 0 ? (
            <div className={styles.rosterList}>
              {feats.map((item) => (
                <div key={item.id} className={styles.rosterMember}>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noreferrer">
                      {item.label}
                    </a>
                  ) : (
                    <span>{item.label}</span>
                  )}
                  {isStaff ? (
                    <span className={styles.upgradeActions}>
                      <button
                        className={styles.inlineActionButton}
                        type="button"
                        onClick={() => beginEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.inlineDangerButton}
                        type="button"
                        onClick={() => handleRemove(item)}
                      >
                        Remove
                      </button>
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.rosterStatus}>No guild feats listed yet.</p>
          )}

          {isStaff && !composerOpen ? (
            <div>
              <button
                className={styles.inlineActionButton}
                type="button"
                onClick={() => {
                  resetComposer();
                  setComposerOpen(true);
                }}
              >
                Add Feat
              </button>
            </div>
          ) : null}

          {isStaff && composerOpen ? (
            <form className={styles.upgradeComposer} onSubmit={handleSubmit}>
              <div className={styles.managerRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Feat</span>
                  <input
                    className={styles.input}
                    value={label}
                    placeholder="Vanguard of Iron - T1 Passive"
                    onChange={(event) => setLabel(event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Link</span>
                  <input
                    className={styles.input}
                    value={href}
                    placeholder="https://www.dndbeyond.com/feats/..."
                    onChange={(event) => setHref(event.target.value)}
                  />
                </label>
              </div>
              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={resetComposer}
                >
                  Cancel
                </button>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingItemId !== null
                      ? "Save Feat"
                      : "Add Feat"}
                </button>
              </div>
            </form>
          ) : null}

          {error ? <p className={styles.error}>{error}</p> : null}
        </>
      ) : null}
    </section>
  );
}
