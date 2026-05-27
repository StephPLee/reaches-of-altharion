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
  createdAt: string;
};

type SessionUser = {
  username: string;
  globalName: string | null;
  isStaff: boolean;
};

function getAuthApiBaseUrl(siteConfig): string {
  const configured = siteConfig.customFields?.authApiBaseUrl;
  return typeof configured === "string" ? configured.replace(/\/$/, "") : "";
}

function StatCard({
  roll,
  onClaim,
  claiming,
}: {
  roll: StatRollSet;
  onClaim: (id: number) => void;
  claiming: boolean;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.statsRow}>
        {roll.stats.map((v, i) => (
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
      <div className={styles.cardFooter}>
        {roll.discordMessageUrl ? (
          <a
            href={roll.discordMessageUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.discordLink}
          >
            View in Discord ↗
          </a>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={styles.claimButton}
          onClick={() => onClaim(roll.id)}
          disabled={claiming}
        >
          {claiming ? "Claiming…" : "Claim"}
        </button>
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

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });
        if (!res.ok) { setAuthLoading(false); return; }
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
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setClaimError(payload.error ?? "Failed to claim stat roll.");
        return;
      }
      setRolls((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setClaimError("Something went wrong. Please try again.");
    } finally {
      setClaimingId(null);
    }
  }

  function handleLogin() {
    window.location.href = `${authApiBaseUrl}/auth/discord/login?returnTo=/stat-rolls`;
  }

  return (
    <Layout title="Stat Rolls" description="Available stat roll sets to claim.">
      <ToolsSidebarFrame sidebarOffset="5.3rem">
        <div className={styles.page}>
          <div className={styles.shell}>
            <h1 className={styles.heading}>Stat Roll Repository</h1>
            <p className={styles.intro}>
              Available stat lines
            </p>

            {!authLoading && !user && (
              <div className={styles.loginBanner}>
                <p>You need to be logged in to claim a stat roll set.</p>
                <button
                  type="button"
                  className={styles.loginButton}
                  onClick={handleLogin}
                >
                  Log in with Discord
                </button>
              </div>
            )}

            {claimError && <p className={styles.error}>{claimError}</p>}

            {rollsLoading && <p className={styles.hint}>Loading stat rolls…</p>}
            {rollsError && <p className={styles.error}>{rollsError}</p>}

            {!rollsLoading && !rollsError && rolls.length === 0 && (
              <p className={styles.hint}>
                No stat roll sets are currently available. Check back after a
                staff member runs <code>/rollstats</code> in Discord.
              </p>
            )}

            {!rollsLoading && rolls.length > 0 && (
              <div className={styles.grid}>
                {rolls.map((roll) => (
                  <StatCard
                    key={roll.id}
                    roll={roll}
                    onClaim={user ? handleClaim : handleLogin}
                    claiming={claimingId === roll.id}
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
