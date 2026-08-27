import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./stat-rolls.module.css";

type StatRollSet = {
  id: number;
  stats: number[];
  total: number;
  discordMessageUrl: string | null;
  rolledByDiscordUserId: string | null;
  rolledByUsername: string | null;
  claimedByDiscordUserId: string | null;
  claimedByUsername: string | null;
  lockedUntil: string | null;
  createdAt: string;
};

type SessionUser = {
  username: string;
  globalName: string | null;
  isStaff: boolean;
  discordUserId: string;
};

type StatRollPredicate = (roll: StatRollSet) => boolean;

function getAuthApiBaseUrl(siteConfig): string {
  const configured = siteConfig.customFields?.authApiBaseUrl;
  return typeof configured === "string" ? configured.replace(/\/$/, "") : "";
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function countStats(roll: StatRollSet, predicate: (value: number) => boolean) {
  return roll.stats.filter(predicate).length;
}

function parseStatSearchClause(clause: string): StatRollPredicate | null {
  const q = clause.trim().toLowerCase();
  if (!q) return null;

  const totalMatch =
    q.match(/^total\s*[:=]?\s*(\d{2,3})$/) ||
    q.match(/^sum\s*[:=]?\s*(\d{2,3})$/) ||
    q.match(/^=\s*(\d{2,3})$/) ||
    q.match(/^(\d{2,3})$/);
  if (totalMatch) {
    const expectedTotal = Number(totalMatch[1]);
    return (roll) => roll.total === expectedTotal;
  }

  const exactCountMatch =
    q.match(/^(\d+)\s*(?:x|\*)\s*(\d{1,2})s?$/) ||
    q.match(/^(\d{1,2})s?\s*(?:x|\*)\s*(\d+)$/);
  if (exactCountMatch) {
    const first = Number(exactCountMatch[1]);
    const second = Number(exactCountMatch[2]);
    const expectedCount = first > 6 ? second : first;
    const statValue = first > 6 ? first : second;
    return (roll) => countStats(roll, (value) => value === statValue) >= expectedCount;
  }

  const naturalExactMatch = q.match(/^(\d+)\s+(\d{1,2})s?$/);
  if (naturalExactMatch) {
    const expectedCount = Number(naturalExactMatch[1]);
    const statValue = Number(naturalExactMatch[2]);
    if (expectedCount <= 6) {
      return (roll) => countStats(roll, (value) => value === statValue) >= expectedCount;
    }
  }

  const atLeastMatch =
    q.match(/^(\d{1,2})\+\s*(?:x|\*)?\s*(\d+)$/) ||
    q.match(/^(\d+)\s*(?:at\s+least|>=)\s*(\d{1,2})$/);
  if (atLeastMatch) {
    const first = Number(atLeastMatch[1]);
    const second = Number(atLeastMatch[2]);
    const threshold = first > 6 ? first : second;
    const expectedCount = first > 6 ? second : first;
    return (roll) => countStats(roll, (value) => value >= threshold) >= expectedCount;
  }

  const overMatch = q.match(/^(\d+)\s*(?:over|above|>)\s*(\d{1,2})$/);
  if (overMatch) {
    const expectedCount = Number(overMatch[1]);
    const threshold = Number(overMatch[2]);
    return (roll) => countStats(roll, (value) => value > threshold) >= expectedCount;
  }

  const statMatch = q.match(/^stat\s*[:=]\s*(\d{1,2})$/);
  if (statMatch) {
    const statValue = Number(statMatch[1]);
    return (roll) => roll.stats.includes(statValue);
  }

  return null;
}

function parseStatSearchQuery(query: string) {
  const clauses = query
    .split(/[,\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const statPredicates: StatRollPredicate[] = [];
  const textClauses: string[] = [];

  for (const clause of clauses) {
    const predicate = parseStatSearchClause(clause);
    if (predicate) {
      statPredicates.push(predicate);
    } else {
      textClauses.push(clause.toLowerCase());
    }
  }

  return { statPredicates, textClauses };
}

function StatCard({
  roll,
  onClaim,
  claiming,
  currentUserDiscordId,
  isLoggedIn,
}: {
  roll: StatRollSet;
  onClaim: (id: number) => void;
  claiming: boolean;
  currentUserDiscordId: string | null;
  isLoggedIn: boolean;
}) {
  const isLocked =
    roll.lockedUntil !== null &&
    new Date() < new Date(roll.lockedUntil) &&
    roll.rolledByDiscordUserId !== currentUserDiscordId;

  const lockedUntilDate = roll.lockedUntil ? new Date(roll.lockedUntil) : null;

  const buttonTitle = !isLoggedIn
    ? "Log in with Discord to claim"
    : isLocked
      ? `Reserved for roller until ${lockedUntilDate?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — available to claim after that`
      : undefined;

  const buttonLabel = claiming ? "Claiming…" : isLocked ? "Locked" : "Claim";

  return (
    <div className={styles.card}>
      <div className={styles.statsRow}>
        {[...roll.stats]
          .sort((a, b) => b - a)
          .map((v, i) => (
            <span
              key={i}
              className={`${styles.statBadge} ${
                v > 15
                  ? styles.statHigh
                  : v < 10
                    ? styles.statLow
                    : styles.statMid
              }`}
            >
              {v}
            </span>
          ))}
        <span className={styles.total}>= {roll.total}</span>
      </div>
      <span className={styles.rollerText}>
        {roll.rolledByUsername ? `@${roll.rolledByUsername}` : "Unknown roller"}
      </span>
      <span className={styles.dateText}>{formatDate(roll.createdAt)}</span>
      <div className={styles.cardActions}>
        {isLoggedIn && roll.discordMessageUrl && (
          <a
            href={roll.discordMessageUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.discordLink}
          >
            Source ↗
          </a>
        )}
        {roll.claimedByDiscordUserId ? (
          <span
            className={styles.claimedLabel}
            title={`Claimed by ${roll.claimedByUsername ?? "someone"}`}
          >
            Claimed by {roll.claimedByUsername ?? "someone"}
          </span>
        ) : (
          <button
            type="button"
            className={styles.claimButton}
            onClick={() => onClaim(roll.id)}
            disabled={claiming || isLocked || !isLoggedIn}
            title={buttonTitle}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function StatRollsPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rolls, setRolls] = useState<StatRollSet[]>([]);
  const [rollsLoading, setRollsLoading] = useState(true);
  const [rollsError, setRollsError] = useState("");
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "available" | "locked" | "claimed"
  >("available");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });
        if (!res.ok) {
          setAuthLoading(false);
          return;
        }
        const payload = await res.json();
        setUser(payload.authenticated ? payload.user : null);
      } catch {
        // stay null
      } finally {
        setAuthLoading(false);
      }
    }
    loadUser();
  }, [authApiBaseUrl]);

  useEffect(() => {
    async function loadRolls() {
      try {
        const res = await fetch(`${authApiBaseUrl}/api/stat-rolls`);
        if (!res.ok) throw new Error("Failed to load stat rolls.");
        const payload = await res.json();
        setRolls(payload.statRolls ?? []);
      } catch {
        setRollsError("Failed to load stat rolls. Please try again.");
      } finally {
        setRollsLoading(false);
      }
    }
    loadRolls();
  }, [authApiBaseUrl]);

  async function handleClaim(id: number) {
    if (!user) return;
    setClaimingId(id);
    setClaimError("");
    try {
      const res = await fetch(`${authApiBaseUrl}/api/stat-rolls/${id}/claim`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClaimError(payload.error ?? "Failed to claim stat roll.");
        return;
      }
      const claimed = payload.statRoll as StatRollSet;
      setRolls((prev) => prev.map((r) => (r.id === id ? claimed : r)));
    } catch {
      setClaimError("Something went wrong. Please try again.");
    } finally {
      setClaimingId(null);
    }
  }

  const isWithinLockPeriod = (r: StatRollSet) =>
    r.lockedUntil !== null &&
    new Date() < new Date(r.lockedUntil) &&
    !r.claimedByDiscordUserId;

  const parsedSearch = parseStatSearchQuery(searchQuery);
  const filteredRolls = rolls.filter((roll) => {
    if (!searchQuery.trim()) return true;
    const matchesStats = parsedSearch.statPredicates.every((predicate) =>
      predicate(roll),
    );
    const matchesText = parsedSearch.textClauses.every((clause) =>
      (roll.rolledByUsername ?? "").toLowerCase().includes(clause),
    );
    return matchesStats && matchesText;
  });

  const availableRolls = filteredRolls.filter(
    (r) => !r.claimedByDiscordUserId && !isWithinLockPeriod(r),
  );
  const lockedRolls = filteredRolls.filter(isWithinLockPeriod);
  const claimedRolls = filteredRolls.filter((r) => r.claimedByDiscordUserId);
  const displayRolls =
    activeTab === "available"
      ? availableRolls
      : activeTab === "locked"
        ? lockedRolls
        : claimedRolls;

  const totalAvailable = rolls.filter(
    (r) => !r.claimedByDiscordUserId && !isWithinLockPeriod(r),
  ).length;
  const totalLocked = rolls.filter(isWithinLockPeriod).length;
  const totalClaimed = rolls.filter((r) => r.claimedByDiscordUserId).length;

  return (
    <Layout title="Stat Rolls" description="Available stat roll sets to claim.">
      <div className={styles.page}>
          <div className={styles.shell}>
            <h1 className={styles.heading}>Stat Roll Repository</h1>
            <p className={styles.intro}>
              Browse unclaimed stat arrays, reserve one for a character, or
              check which rolls are locked and claimed.
            </p>

            {claimError && <p className={styles.error}>{claimError}</p>}

            <div className={styles.controls}>
              <div className={styles.tabs}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "available" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("available")}
                >
                  Available
                  {!rollsLoading && (
                    <span className={styles.tabCount}>{totalAvailable}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "locked" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("locked")}
                >
                  Locked
                  {!rollsLoading && (
                    <span className={styles.tabCount}>{totalLocked}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === "claimed" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("claimed")}
                >
                  Claimed
                  {!rollsLoading && (
                    <span className={styles.tabCount}>{totalClaimed}</span>
                  )}
                </button>
              </div>
              <label className={styles.searchField}>
                <span className={styles.searchLabel}>Find a Roll</span>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search by roller, total:84, 84, 18x2, 2 18s, 15+ x3, 3 over 15, stat:18"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
            </div>

            {rollsLoading && <p className={styles.hint}>Loading stat rolls…</p>}
            {rollsError && <p className={styles.error}>{rollsError}</p>}

            {!rollsLoading && !rollsError && displayRolls.length === 0 && (
              <p className={styles.hint}>
                {searchQuery.trim()
                  ? "No stat rolls match that search."
                  : activeTab === "available"
                    ? "No available stat roll sets right now. Check back after a server member runs /rollstats in Discord."
                    : activeTab === "locked"
                      ? "No locked stat rolls right now."
                      : "No claimed stat rolls yet."}
              </p>
            )}

            {!rollsLoading && displayRolls.length > 0 && (
              <div className={styles.grid}>
                {displayRolls.map((roll) => (
                  <StatCard
                    key={roll.id}
                    roll={roll}
                    onClaim={handleClaim}
                    claiming={claimingId === roll.id}
                    currentUserDiscordId={user?.discordUserId ?? null}
                    isLoggedIn={!!user}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
    </Layout>
  );
}
