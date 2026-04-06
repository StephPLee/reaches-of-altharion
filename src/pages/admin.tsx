import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useHistory } from "@docusaurus/router";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./admin.module.css";

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
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementRoleIds, setAnnouncementRoleIds] = useState<string[]>([]);
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [announcementRoleQuery, setAnnouncementRoleQuery] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementError, setAnnouncementError] = useState("");
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] =
    useState(false);

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

  return (
    <Layout title="Staff Panel" description="Discord-authenticated admin area.">
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Administrative Access</p>
          <Heading as="h1">Staff Panel</Heading>
          <p className={styles.intro}>
            This is the authenticated entry point for calendar and wiki editing.
            Calendar CRUD is the next feature to land here.
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
                <div className={styles.actions}>
                  <Link to="/calendar" className={styles.button}>
                    Open Calendar Tools
                  </Link>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </div>
                <div className={styles.formPanel}>
                  <Heading as="h2">Calendar Tools Moved</Heading>
                  <p className={styles.meta}>
                    The calendar creation workflow now lives directly on the
                    public calendar page and only appears when a signed-in staff
                    member opens it.
                  </p>
                </div>
                <div className={styles.formPanel}>
                  <Heading as="h2">Post Announcement</Heading>
                  <p className={styles.meta}>
                    Send a plain text announcement to the same Discord
                    announcements channel used for calendar event posts.
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
                      maxLength={2000}
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
                </div>
              </>
            ) : null}
          </section>
        </div>
      </main>
    </Layout>
  );
}
