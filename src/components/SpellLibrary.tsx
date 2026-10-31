import { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import faqStyles from "./FaqDirectory.module.css";
import styles from "./SpellLibrary.module.css";

type Holder = {
  spellbookId: number;
  characterName: string;
};

type LibrarySpell = {
  id: number;
  name: string;
  level: number;
  isHidden: boolean;
  holders: Holder[];
};

type SessionUser = {
  isStaff: boolean;
};

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function formatLevel(level: number) {
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix} Level`;
}

function matchesSearch(spell: LibrarySpell, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }

  const haystack = [
    spell.name,
    ...spell.holders.map((holder) => holder.characterName),
  ]
    .join("\n")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export default function SpellLibrary() {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [spells, setSpells] = useState<LibrarySpell[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isStaff = Boolean(currentUser?.isStaff);
  const filteredSpells = useMemo(
    () =>
      spells.filter(
        (spell) =>
          (levelFilter === "all" || spell.level === Number(levelFilter)) &&
          matchesSearch(spell, searchQuery),
      ),
    [spells, levelFilter, searchQuery],
  );
  const levelSections = useMemo(
    () =>
      LEVELS.map((level) => ({
        level,
        spells: filteredSpells.filter((spell) => spell.level === level),
      })).filter((section) => section.spells.length > 0),
    [filteredSpells],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSpells() {
      try {
        setLoading(true);
        const response = await fetch(`${authApiBaseUrl}/api/spell-library`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Failed to load the spell library (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setSpells(Array.isArray(payload.spells) ? payload.spells : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load the spell library.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSpells();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

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

  async function handleToggleHidden(spell: LibrarySpell) {
    const isHidden = !spell.isHidden;
    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/spell-library/spells/${spell.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isHidden }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update the spell.");
      }

      setSpells((current) =>
        current.map((entry) =>
          entry.id === spell.id ? { ...entry, isHidden } : entry,
        ),
      );
      setMessage(`${spell.name} is now ${isHidden ? "hidden" : "visible"}.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update the spell.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveSpellbook(holder: Holder) {
    if (
      !window.confirm(
        `Remove ${holder.characterName}'s spellbook from the library? They will no longer be listed for any spell.`,
      )
    ) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/spell-library/spellbooks/${holder.spellbookId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to remove the spellbook.");
      }

      setSpells((current) =>
        current
          .map((spell) => ({
            ...spell,
            holders: spell.holders.filter(
              (entry) => entry.spellbookId !== holder.spellbookId,
            ),
          }))
          .filter((spell) => spell.holders.length > 0),
      );
      setMessage(`Removed ${holder.characterName}'s spellbook.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to remove the spellbook.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderHolders(spell: LibrarySpell) {
    if (!isStaff) {
      return spell.holders.map((holder) => holder.characterName).join(", ");
    }

    return spell.holders.map((holder, index) => (
      <span key={holder.spellbookId}>
        {index > 0 ? ", " : null}
        <button
          className={styles.holderButton}
          type="button"
          title={`Remove ${holder.characterName}'s spellbook`}
          onClick={() => handleRemoveSpellbook(holder)}
          disabled={isSaving}
        >
          {holder.characterName}
        </button>
      </span>
    ));
  }

  function renderSpellRow(spell: LibrarySpell) {
    return (
      <tr key={spell.id} className={spell.isHidden ? styles.hiddenRow : undefined}>
        <td className={styles.spellName}>
          {spell.name}
          {spell.isHidden ? <span className={styles.hiddenTag}>Hidden</span> : null}
        </td>
        <td>{renderHolders(spell)}</td>
        {isStaff ? (
          <td className={styles.actionCell}>
            <button
              className={faqStyles.secondaryButton}
              type="button"
              onClick={() => handleToggleHidden(spell)}
              disabled={isSaving}
            >
              {spell.isHidden ? "Unhide" : "Hide"}
            </button>
          </td>
        ) : null}
      </tr>
    );
  }

  const isFiltered = Boolean(searchQuery.trim()) || levelFilter !== "all";

  return (
    <section className={faqStyles.shell}>
      {isStaff ? (
        <div className={faqStyles.controlsPanel}>
          <div className={faqStyles.controlsRow}>
            <span>
              Signed in with library editing access. Click a character name to
              remove their spellbook.
            </span>
          </div>
          {message ? <p className={faqStyles.message}>{message}</p> : null}
          {error ? <p className={faqStyles.error}>{error}</p> : null}
        </div>
      ) : null}

      <div className={styles.filters}>
        <label className={faqStyles.field}>
          <span className={faqStyles.fieldLabel}>Search spells</span>
          <input
            className={faqStyles.input}
            type="search"
            value={searchQuery}
            placeholder="Search by spell or character name..."
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <label className={faqStyles.field}>
          <span className={faqStyles.fieldLabel}>Level</span>
          <select
            className={faqStyles.input}
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
          >
            <option value="all">All</option>
            {LEVELS.map((level) => (
              <option key={level} value={String(level)}>
                {formatLevel(level)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <p>Loading spells...</p> : null}
      {!isStaff && error ? <p className={faqStyles.error}>{error}</p> : null}

      {!loading ? (
        <>
          <p className={styles.resultCount}>
            {isFiltered
              ? `Showing ${filteredSpells.length} of ${spells.length} spells`
              : `${spells.length} spells`}
          </p>
          {levelSections.length === 0 ? (
            <p className={styles.empty}>
              {spells.length === 0
                ? "No spellbooks have been added yet."
                : "No spells match your search."}
            </p>
          ) : (
            levelSections.map((section) => (
              <section
                className={`${faqStyles.category} ${styles.levelSection}`}
                key={section.level}
              >
                <div className={faqStyles.categoryHeader}>
                  <h2 className={faqStyles.categoryTitle}>
                    {formatLevel(section.level)}
                  </h2>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.spellColumn}>Spell</th>
                        <th>Known by</th>
                        {isStaff ? (
                          <th className={styles.actionColumn} aria-label="Actions" />
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>{section.spells.map(renderSpellRow)}</tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </>
      ) : null}
    </section>
  );
}
