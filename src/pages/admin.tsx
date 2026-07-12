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

type AdminSection = "marketplace" | "discord" | "events";

type RewardEvent = {
  id: number;
  name: string;
  currencyId: string;
  currencyName: string;
  startsAt: string;
  endsAt: string;
  ruleType: "final_participant_fixed" | "sc_percentage" | "event_quest_fixed";
  fixedAmount: number;
  nonEventScPercent: number;
  eventScPercent: number;
  enabled: boolean;
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
  const [rewardEvents, setRewardEvents] = useState<RewardEvent[]>([]);
  const [editingRewardEventId, setEditingRewardEventId] = useState<number | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventCurrencyName, setEventCurrencyName] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventRuleType, setEventRuleType] = useState<RewardEvent["ruleType"]>("event_quest_fixed");
  const [eventFixedAmount, setEventFixedAmount] = useState("5");
  const [eventNonQuestPercent, setEventNonQuestPercent] = useState("50");
  const [eventQuestPercent, setEventQuestPercent] = useState("100");
  const [eventEnabled, setEventEnabled] = useState(true);
  const [eventMessage, setEventMessage] = useState("");
  const [eventError, setEventError] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [finalPreview, setFinalPreview] = useState<{ eventId: number; participants: Array<{ characterId: string; characterName: string; rewarded: boolean }> } | null>(null);

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

  useEffect(() => {
    if (!user?.isStaff || activeSection !== "events") return;
    let cancelled = false;
    fetch(`${authApiBaseUrl}/api/admin/reward-events`, { credentials: "include" })
      .then(async (eventsResponse) => {
        const eventsPayload = await eventsResponse.json();
        if (!eventsResponse.ok) throw new Error(eventsPayload.error || "Failed to load events.");
        if (!cancelled) setRewardEvents(eventsPayload.events || []);
      })
      .catch((error) => !cancelled && setEventError(error.message));
    return () => { cancelled = true; };
  }, [activeSection, authApiBaseUrl, user?.isStaff]);

  function toLocalInput(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function editRewardEvent(event: RewardEvent) {
    setEditingRewardEventId(event.id);
    setEventName(event.name);
    setEventCurrencyName(event.currencyName);
    setEventStartsAt(toLocalInput(event.startsAt));
    setEventEndsAt(toLocalInput(event.endsAt));
    setEventRuleType(event.ruleType);
    setEventFixedAmount(String(event.fixedAmount));
    setEventNonQuestPercent(String(event.nonEventScPercent));
    setEventQuestPercent(String(event.eventScPercent));
    setEventEnabled(event.enabled);
    setEventMessage("");
    setEventError("");
  }

  function resetRewardEventForm() {
    setEditingRewardEventId(null);
    setEventName("");
    setEventCurrencyName("");
    setEventStartsAt("");
    setEventEndsAt("");
    setEventRuleType("event_quest_fixed");
    setEventFixedAmount("5");
    setEventNonQuestPercent("50");
    setEventQuestPercent("100");
    setEventEnabled(true);
  }

  async function saveRewardEvent() {
    if (!eventCurrencyName.trim() || !eventStartsAt || !eventEndsAt) {
      setEventError("Enter a currency name and event start/end times.");
      return;
    }
    setIsSavingEvent(true);
    setEventError("");
    setEventMessage("");
    try {
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/reward-events${editingRewardEventId ? `/${editingRewardEventId}` : ""}`,
        {
          method: editingRewardEventId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: eventName,
            currencyName: eventCurrencyName.trim(),
            startsAt: new Date(eventStartsAt).toISOString(),
            endsAt: new Date(eventEndsAt).toISOString(),
            calendarStartDate: eventStartsAt.slice(0, 10),
            calendarEndDate: eventEndsAt.slice(0, 10),
            ruleType: eventRuleType,
            fixedAmount: Number(eventFixedAmount),
            nonEventScPercent: Number(eventNonQuestPercent),
            eventScPercent: Number(eventQuestPercent),
            enabled: eventEnabled,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to save event.");
      setRewardEvents((current) => {
        const next = current.filter((entry) => entry.id !== payload.event.id);
        return [payload.event, ...next].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
      });
      setEventMessage(`Saved ${payload.event.name}.`);
      resetRewardEventForm();
    } catch (error) {
      setEventError(error instanceof Error ? error.message : "Failed to save event.");
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function previewFinalRewards(eventId: number) {
    setEventError("");
    const response = await fetch(`${authApiBaseUrl}/api/admin/reward-events/${eventId}/final-preview`, { credentials: "include" });
    const payload = await response.json();
    if (!response.ok) {
      setEventError(payload.error || "Failed to preview participants.");
      return;
    }
    setFinalPreview({ eventId, participants: payload.participants || [] });
  }

  async function distributeFinalRewards(eventId: number) {
    if (!window.confirm("Distribute the final event currency to every pending participant?")) return;
    setEventError("");
    const response = await fetch(`${authApiBaseUrl}/api/admin/reward-events/${eventId}/distribute-final`, {
      method: "POST",
      credentials: "include",
    });
    const payload = await response.json();
    if (!response.ok) {
      setEventError(payload.error || "Failed to distribute final rewards.");
      return;
    }
    setEventMessage(`Distributed final rewards to ${payload.distributed} participant(s).`);
    await previewFinalRewards(eventId);
  }
  return (
    <Layout title="Staff Panel" description="Discord-authenticated admin area.">
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Administrative Access</p>
          <Heading as="h1">Staff Panel</Heading>

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
                  <button
                    type="button"
                    className={`${styles.sectionTab} ${
                      activeSection === "events" ? styles.sectionTabActive : ""
                    }`.trim()}
                    onClick={() => setActiveSection("events")}
                  >
                    Schedule an Event
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

                {activeSection === "events" ? (
                <section className={styles.toolSection}>
                  <Heading as="h2">Schedule an Event</Heading>
                  <p className={styles.meta}>
                    Schedule one enabled event at a time. Its currency and rule automatically control the rewards calculator during the configured dates.
                  </p>
                  <div className={styles.field}>
                    <label htmlFor="reward-event-name">Event Name</label>
                    <input id="reward-event-name" className={styles.input} value={eventName} onChange={(event) => setEventName(event.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="reward-event-currency">Event Currency</label>
                    <input
                      id="reward-event-currency"
                      className={styles.input}
                      value={eventCurrencyName}
                      onChange={(event) => setEventCurrencyName(event.target.value)}
                      placeholder="Enter the currency name exactly as it appears in West Marches"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="reward-event-start">Starts</label>
                    <input id="reward-event-start" className={styles.input} type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="reward-event-end">Ends</label>
                    <input id="reward-event-end" className={styles.input} type="datetime-local" value={eventEndsAt} onChange={(event) => setEventEndsAt(event.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="reward-event-rule">Reward Rule</label>
                    <select id="reward-event-rule" className={styles.input} value={eventRuleType} onChange={(event) => setEventRuleType(event.target.value as RewardEvent["ruleType"])}>
                      <option value="event_quest_fixed">Fixed amount per event quest</option>
                      <option value="sc_percentage">Percentage of SC</option>
                      <option value="final_participant_fixed">Fixed amount to unique participants at event end</option>
                    </select>
                  </div>
                  {eventRuleType === "sc_percentage" ? (
                    <>
                      <div className={styles.field}>
                        <label htmlFor="reward-event-normal-percent">Non-event Quest (% of SC)</label>
                        <input id="reward-event-normal-percent" className={styles.input} type="number" min="0" value={eventNonQuestPercent} onChange={(event) => setEventNonQuestPercent(event.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="reward-event-quest-percent">Event Quest (% of SC)</label>
                        <input id="reward-event-quest-percent" className={styles.input} type="number" min="0" value={eventQuestPercent} onChange={(event) => setEventQuestPercent(event.target.value)} />
                      </div>
                    </>
                  ) : (
                    <div className={styles.field}>
                      <label htmlFor="reward-event-fixed">{eventRuleType === "final_participant_fixed" ? "Final Amount per Unique Participant" : "Amount per Event Quest"}</label>
                      <input id="reward-event-fixed" className={styles.input} type="number" min="0" value={eventFixedAmount} onChange={(event) => setEventFixedAmount(event.target.value)} />
                    </div>
                  )}
                  <label className={styles.toggleRow} htmlFor="reward-event-enabled">
                    <input
                      id="reward-event-enabled"
                      type="checkbox"
                      checked={eventEnabled}
                      onChange={(event) => setEventEnabled(event.target.checked)}
                    />
                    <span>Enabled</span>
                  </label>
                  {eventMessage ? <p className={styles.successMessage}>{eventMessage}</p> : null}
                  {eventError ? <p className={styles.errorMessage}>{eventError}</p> : null}
                  <div className={styles.actions}>
                    <button type="button" className={styles.button} onClick={saveRewardEvent} disabled={isSavingEvent}>{isSavingEvent ? "Saving..." : editingRewardEventId ? "Update Event" : "Create Event"}</button>
                    {editingRewardEventId ? <button type="button" className={styles.button} onClick={resetRewardEventForm}>Cancel Edit</button> : null}
                  </div>
                  <div className={styles.marketplaceHistory}>
                    <Heading as="h3">Configured Events</Heading>
                    {rewardEvents.length === 0 ? <p className={styles.meta}>No reward events configured.</p> : null}
                    {rewardEvents.map((event) => (
                      <div key={event.id} className={styles.historyItem}>
                        <div>
                          <strong>{event.name}</strong>
                          <p className={styles.meta}>{new Date(event.startsAt).toLocaleString()} – {new Date(event.endsAt).toLocaleString()} · {event.currencyName} · {event.enabled ? "enabled" : "disabled"}</p>
                        </div>
                        <div className={styles.actions}>
                          <button type="button" className={styles.button} onClick={() => editRewardEvent(event)}>Edit</button>
                          {event.ruleType === "final_participant_fixed" ? <button type="button" className={styles.button} onClick={() => previewFinalRewards(event.id)}>Preview Final Payout</button> : null}
                        </div>
                        {finalPreview?.eventId === event.id ? (
                          <div>
                            <p className={styles.meta}>{finalPreview.participants.filter((entry) => !entry.rewarded).length} pending unique participant(s), {finalPreview.participants.filter((entry) => entry.rewarded).length} already rewarded.</p>
                            <p className={styles.meta}>{finalPreview.participants.map((entry) => `${entry.characterName}${entry.rewarded ? " (rewarded)" : ""}`).join(", ") || "No participants recorded yet."}</p>
                            <button type="button" className={styles.button} onClick={() => distributeFinalRewards(event.id)} disabled={finalPreview.participants.every((entry) => entry.rewarded)}>Distribute Pending Final Rewards</button>
                          </div>
                        ) : null}
                      </div>
                    ))}
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
