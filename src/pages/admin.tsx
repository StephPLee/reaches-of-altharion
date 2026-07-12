import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useHistory } from "@docusaurus/router";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./admin.module.css";

const ANNOUNCEMENT_CHARACTER_LIMIT = 10000;
const MARKETPLACE_CHARACTER_LIMIT = 10000;

type SessionUser = {
  id?: number;
  username: string;
  globalName: string | null;
  isStaff: boolean;
  isDm?: boolean;
  canSubmitRewards?: boolean;
};


type DiscordRole = {
  id: string;
  name: string;
  position: number;
};

type MarketplaceEntry = {
  id: number;
  source: "generated" | "manual" | "consumables";
  content: string;
  scheduledFor: string;
  status: "scheduled" | "published" | "error";
  publishedAt?: string | null;
  errorMessage?: string | null;
};

type AdminSection = "marketplace" | "discord";

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

export default function AdminPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const history = useHistory();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [activeSection, setActiveSection] =
    useState<AdminSection>("marketplace");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementRoleIds, setAnnouncementRoleIds] = useState<string[]>([]);
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [announcementRoleQuery, setAnnouncementRoleQuery] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementError, setAnnouncementError] = useState("");
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] =
    useState(false);
  const [marketplaceContent, setMarketplaceContent] = useState("");
  const [marketplaceSource, setMarketplaceSource] =
    useState<"generated" | "manual" | "consumables">("generated");
  const [marketplaceScheduledForLocal, setMarketplaceScheduledForLocal] =
    useState("");
  const [marketplaceTimeZone, setMarketplaceTimeZone] =
    useState("Europe/London");
  const [marketplaces, setMarketplaces] = useState<MarketplaceEntry[]>([]);
  const [marketplaceMessage, setMarketplaceMessage] = useState("");
  const [marketplaceError, setMarketplaceError] = useState("");
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(false);
  const [isGeneratingMarketplace, setIsGeneratingMarketplace] = useState(false);
  const [isGeneratingConsumables, setIsGeneratingConsumables] = useState(false);
  const [isSchedulingMarketplace, setIsSchedulingMarketplace] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setIsLoading(true);
        const response = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });

        if (response.status === 401) {
          if (!cancelled) {
            setUser(null);
            history.replace("/?view=map");
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load auth session (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          const nextUser = payload.authenticated ? payload.user : null;
          if (nextUser && !nextUser.isStaff) {
            setUser(null);
            history.replace("/?view=map");
            return;
          }
          setUser(nextUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          history.replace("/?view=map");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, history]);

  useEffect(() => {
    if (!user?.isStaff) {
      setDiscordRoles([]);
      setAnnouncementRoleIds([]);
      setIsRolesLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDiscordRoles() {
      try {
        setIsRolesLoading(true);

        const response = await fetch(
          `${authApiBaseUrl}/api/admin/discord/roles`,
          {
            credentials: "include",
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load Discord roles.");
        }

        if (!cancelled) {
          const nextRoles = Array.isArray(payload.roles) ? payload.roles : [];
          setDiscordRoles(nextRoles);
          setAnnouncementRoleIds((currentRoleIds) => {
            const nextRoleIds = currentRoleIds.filter((roleId) =>
              nextRoles.some((role) => role.id === roleId),
            );

            if (nextRoleIds.length > 0) {
              return nextRoleIds;
            }

            const defaultRole = nextRoles.find(
              (role) =>
                role.name.localeCompare("Player", undefined, {
                  sensitivity: "base",
                }) === 0,
            );

            return defaultRole ? [defaultRole.id] : [];
          });
        }
      } catch (roleError) {
        if (!cancelled) {
          setDiscordRoles([]);
          setAnnouncementError(
            roleError instanceof Error
              ? roleError.message
              : "Failed to load Discord roles.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsRolesLoading(false);
        }
      }
    }

    loadDiscordRoles();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, user?.isStaff]);

  async function loadMarketplaceData() {
    if (!user?.isStaff) {
      return;
    }

    try {
      setIsMarketplaceLoading(true);
      setMarketplaceError("");

      const response = await fetch(`${authApiBaseUrl}/api/admin/marketplace`, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load marketplace data.");
      }

      setMarketplaceTimeZone(payload.timeZone || "Europe/London");
      setMarketplaceScheduledForLocal(
        payload.defaultScheduledForLocal || "",
      );
      setMarketplaces(
        Array.isArray(payload.marketplaces) ? payload.marketplaces : [],
      );
    } catch (loadError) {
      setMarketplaceError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load marketplace data.",
      );
    } finally {
      setIsMarketplaceLoading(false);
    }
  }

  useEffect(() => {
    loadMarketplaceData();
  }, [authApiBaseUrl, user?.isStaff]);

  const filteredDiscordRoles = useMemo(() => {
    const normalizedQuery = announcementRoleQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return discordRoles;
    }

    return discordRoles.filter((role) =>
      role.name.toLowerCase().includes(normalizedQuery),
    );
  }, [announcementRoleQuery, discordRoles]);

  function toggleAnnouncementRole(roleId: string) {
    setAnnouncementRoleIds((currentRoleIds) =>
      currentRoleIds.includes(roleId)
        ? currentRoleIds.filter((id) => id !== roleId)
        : [...currentRoleIds, roleId],
    );
  }



  async function handleLogout() {
    try {
      await fetch(`${authApiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      history.replace("/?view=map");
    }
  }

  async function handleAnnouncementSubmit() {
    if (!announcementText.trim()) {
      setAnnouncementMessage("");
      setAnnouncementError("Enter announcement text before posting.");
      return;
    }

    try {
      setIsSubmittingAnnouncement(true);
      setAnnouncementMessage("");
      setAnnouncementError("");

      const response = await fetch(`${authApiBaseUrl}/api/admin/announcements`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: announcementText.trim(),
          roleIds: announcementRoleIds,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to post announcement.");
      }

      setAnnouncementMessage("Announcement posted to Discord.");
      setAnnouncementText("");
      setAnnouncementRoleIds([]);
    } catch (submitError) {
      setAnnouncementMessage("");
      setAnnouncementError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to post announcement.",
      );
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  }

  async function handleMarketplaceGenerate() {
    try {
      setIsGeneratingMarketplace(true);
      setMarketplaceMessage("");
      setMarketplaceError("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/marketplace/generate`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate marketplace.");
      }

      setMarketplaceSource("generated");
      setMarketplaceContent(payload.content || "");
      setMarketplaceMessage("Marketplace generated. Review it before scheduling.");
    } catch (generateError) {
      setMarketplaceMessage("");
      setMarketplaceError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate marketplace.",
      );
    } finally {
      setIsGeneratingMarketplace(false);
    }
  }

  async function handleConsumablesMarketplaceGenerate() {
    try {
      setIsGeneratingConsumables(true);
      setMarketplaceMessage("");
      setMarketplaceError("");

      const response = await fetch(
        `${authApiBaseUrl}/api/admin/marketplace/generate-consumables`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error || "Failed to generate consumables marketplace.",
        );
      }

      setMarketplaceSource("consumables");
      setMarketplaceContent(payload.content || "");
      setMarketplaceMessage(
        "Consumables marketplace loaded. Review it before scheduling.",
      );
    } catch (generateError) {
      setMarketplaceMessage("");
      setMarketplaceError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate consumables marketplace.",
      );
    } finally {
      setIsGeneratingConsumables(false);
    }
  }

  async function handleMarketplaceSchedule() {
    if (!marketplaceContent.trim()) {
      setMarketplaceMessage("");
      setMarketplaceError("Enter or generate marketplace content first.");
      return;
    }

    if (!marketplaceScheduledForLocal) {
      setMarketplaceMessage("");
      setMarketplaceError("Choose when the marketplace should post.");
      return;
    }

    try {
      setIsSchedulingMarketplace(true);
      setMarketplaceMessage("");
      setMarketplaceError("");

      const response = await fetch(`${authApiBaseUrl}/api/admin/marketplace`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: marketplaceContent.trim(),
          source: marketplaceSource,
          scheduledForLocal: marketplaceScheduledForLocal,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to schedule marketplace.");
      }

      setMarketplaceMessage("Marketplace scheduled.");
      setMarketplaceContent("");
      setMarketplaceSource("generated");
      await loadMarketplaceData();
    } catch (scheduleError) {
      setMarketplaceMessage("");
      setMarketplaceError(
        scheduleError instanceof Error
          ? scheduleError.message
          : "Failed to schedule marketplace.",
      );
    } finally {
      setIsSchedulingMarketplace(false);
    }
  }

  return (
    <Layout title="Staff Panel" description="Discord-authenticated admin area.">
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Administrative Access</p>
          <Heading as="h1">Staff Panel</Heading>
          <p className={styles.intro}>
            Manage Discord-facing tools that need staff access.
          </p>

          <section className={styles.panel}>
            {isLoading ? (
              <p className={styles.status}>Checking staff session...</p>
            ) : null}

            {!isLoading && !user ? (
              <>
                <p className={styles.status}>You are not signed in.</p>
                <div className={styles.actions}>
                  <a
                    href={`${authApiBaseUrl}/auth/discord/login`}
                    className={styles.button}
                  >
                    Sign in with Discord
                  </a>
                </div>
              </>
            ) : null}

            {!isLoading && user ? (
              <>
                <p className={styles.meta}>
                  Staff role verified: {user.isStaff ? "yes" : "no"}.
                </p>
                <div className={styles.accountBar}>
                  <p className={styles.accountText}>
                    Signed in as {user.globalName || user.username}.
                  </p>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </div>

                <nav className={styles.sectionNav} aria-label="Admin tools">
                  <button
                    type="button"
                    className={`${styles.sectionTab} ${
                      activeSection === "marketplace"
                        ? styles.sectionTabActive
                        : ""
                    }`.trim()}
                    onClick={() => setActiveSection("marketplace")}
                  >
                    Marketplace
                  </button>
                  <button
                    type="button"
                    className={`${styles.sectionTab} ${
                      activeSection === "discord" ? styles.sectionTabActive : ""
                    }`.trim()}
                    onClick={() => setActiveSection("discord")}
                  >
                    Discord
                  </button>
                </nav>

                {activeSection === "discord" ? (
                <section className={styles.toolSection}>
                  <Heading as="h2">Post Announcement</Heading>
                  <p className={styles.meta}>
                    Send a plain text announcement to the configured Discord
                    announcements channel.
                  </p>
                  <div className={styles.field}>
                    <label htmlFor="announcement-text">Announcement Text</label>
                    <textarea
                      id="announcement-text"
                      className={styles.textarea}
                      value={announcementText}
                      onChange={(event) =>
                        setAnnouncementText(event.target.value)
                      }
                      rows={6}
                      maxLength={ANNOUNCEMENT_CHARACTER_LIMIT}
                      placeholder="Write the announcement exactly as it should appear in Discord."
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="announcement-role-search">Roles To Ping (Optional)</label>
                    <input
                      id="announcement-role-search"
                      className={styles.input}
                      value={announcementRoleQuery}
                      onChange={(event) =>
                        setAnnouncementRoleQuery(event.target.value)
                      }
                      placeholder={isRolesLoading ? "Loading roles..." : "Search for roles to add"}
                      disabled={isRolesLoading}
                    />
                    {announcementRoleIds.length > 0 ? (
                      <div className={styles.selectionChips}>
                        {announcementRoleIds.map((roleId) => {
                          const role = discordRoles.find((item) => item.id === roleId);
                          if (!role) {
                            return null;
                          }

                          return (
                            <button
                              key={roleId}
                              type="button"
                              className={styles.selectionChip}
                              onClick={() => toggleAnnouncementRole(roleId)}
                            >
                              {role.name} x
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className={styles.searchResults}>
                      {filteredDiscordRoles.map((role) => {
                        const isSelected = announcementRoleIds.includes(role.id);

                        return (
                          <button
                            key={role.id}
                            type="button"
                            className={`${styles.searchResultButton} ${
                              isSelected ? styles.searchResultButtonSelected : ""
                            }`.trim()}
                            onClick={() => toggleAnnouncementRole(role.id)}
                          >
                            {role.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className={styles.meta}>
                      Choose one or more guild roles to append as pings at the end of the post.
                    </p>
                  </div>
                  {announcementMessage ? (
                    <p className={styles.successMessage}>{announcementMessage}</p>
                  ) : null}
                  {announcementError ? (
                    <p className={styles.errorMessage}>{announcementError}</p>
                  ) : null}
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={handleAnnouncementSubmit}
                      disabled={isSubmittingAnnouncement}
                    >
                      {isSubmittingAnnouncement
                        ? "Posting..."
                        : "Post Announcement"}
                    </button>
                  </div>
                </section>
                ) : null}

                {activeSection === "marketplace" ? (
                <section className={styles.toolSection}>
                  <Heading as="h2">Weekly Marketplace</Heading>
                  <p className={styles.meta}>
                    Generate 10 common, uncommon, rare, and very rare items,
                    load the full consumables market, or paste the
                    player-chosen list manually. The scheduled time is read as{" "}
                    {marketplaceTimeZone}.
                  </p>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={handleMarketplaceGenerate}
                      disabled={isGeneratingMarketplace || isGeneratingConsumables}
                    >
                      {isGeneratingMarketplace ? "Generating..." : "Generate Market"}
                    </button>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={handleConsumablesMarketplaceGenerate}
                      disabled={isGeneratingMarketplace || isGeneratingConsumables}
                    >
                      {isGeneratingConsumables
                        ? "Loading..."
                        : "Consumables Market"}
                    </button>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={() => {
                        setMarketplaceSource("manual");
                        setMarketplaceMessage("");
                        setMarketplaceError("");
                      }}
                    >
                      Use Manual List
                    </button>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="marketplace-schedule">
                      Scheduled Post Time
                    </label>
                    <input
                      id="marketplace-schedule"
                      className={styles.input}
                      type="datetime-local"
                      value={marketplaceScheduledForLocal}
                      onChange={(event) =>
                        setMarketplaceScheduledForLocal(event.target.value)
                      }
                    />
                    <p className={styles.meta}>
                      Default is the next Sunday at noon in Europe/London.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="marketplace-content">Marketplace Post</label>
                    <textarea
                      id="marketplace-content"
                      className={styles.textarea}
                      value={marketplaceContent}
                      onChange={(event) => {
                        setMarketplaceContent(event.target.value);
                        setMarketplaceSource("manual");
                      }}
                      rows={14}
                      maxLength={MARKETPLACE_CHARACTER_LIMIT}
                      placeholder={`Common\nItem Name\nItem Name\n\nUncommon\nItem Name`}
                    />
                    <p className={styles.meta}>
                      {marketplaceContent.length} / {MARKETPLACE_CHARACTER_LIMIT}
                      {" "}characters. Long posts are split across multiple Discord
                      messages when published.
                    </p>
                  </div>
                  {marketplaceMessage ? (
                    <p className={styles.successMessage}>{marketplaceMessage}</p>
                  ) : null}
                  {marketplaceError ? (
                    <p className={styles.errorMessage}>{marketplaceError}</p>
                  ) : null}
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={handleMarketplaceSchedule}
                      disabled={isSchedulingMarketplace}
                    >
                      {isSchedulingMarketplace
                        ? "Scheduling..."
                        : "Schedule Marketplace"}
                    </button>
                  </div>
                  <div className={styles.marketplaceHistory}>
                    <Heading as="h3">Recent Markets</Heading>
                    {isMarketplaceLoading ? (
                      <p className={styles.meta}>Loading marketplace history...</p>
                    ) : null}
                    {!isMarketplaceLoading && marketplaces.length === 0 ? (
                      <p className={styles.meta}>No marketplaces scheduled yet.</p>
                    ) : null}
                    {marketplaces.map((marketplace) => (
                      <div key={marketplace.id} className={styles.historyItem}>
                        <div>
                          <strong>
                            {new Date(marketplace.scheduledFor).toLocaleString(
                              "en-GB",
                              {
                                timeZone: marketplaceTimeZone,
                                dateStyle: "medium",
                                timeStyle: "short",
                              },
                            )}
                          </strong>
                          <p className={styles.meta}>
                            {marketplace.status} - {marketplace.source}
                            {marketplace.errorMessage
                              ? ` - ${marketplace.errorMessage}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </main>
    </Layout>
  );
}
