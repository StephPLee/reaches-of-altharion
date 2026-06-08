import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import ToolsSidebarFrame from "../components/ToolsSidebarFrame";
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
            Discord ↗
          </a>
        )}
        {roll.claimedByDiscordUserId ? (
          <span className={styles.claimedLabel}>
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

  const filteredRolls = rolls.filter((roll) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (roll.rolledByUsername ?? "").toLowerCase().includes(q);
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
      <ToolsSidebarFrame sidebarOffset="5.3rem">
        <div className={styles.page}>
          <div className={styles.shell}>
            <h1 className={styles.heading}>Stat Roll Repository</h1>

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
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search by roller…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {rollsLoading && <p className={styles.hint}>Loading stat rolls…</p>}
            {rollsError && <p className={styles.error}>{rollsError}</p>}

            {!rollsLoading && !rollsError && displayRolls.length === 0 && (
              <p className={styles.hint}>
                {searchQuery.trim()
                  ? "No rolls found matching that roller."
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
      </ToolsSidebarFrame>
    </Layout>
  );
}
