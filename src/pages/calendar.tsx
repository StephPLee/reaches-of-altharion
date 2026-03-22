import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./calendar.module.css";

type SessionUser = {
  id?: number;
  username: string;
  globalName: string | null;
  isStaff: boolean;
};

type EventRecord = {
  id?: number;
  title: string;
  startDate: string;
  endDate: string;
  category: string;
  summary: string;
  details?: string;
  slug?: string;
};

type EventMonthGroup = {
  id: string;
  label: string;
  events: EventRecord[];
};

type FormState = {
  title: string;
  startDate: string;
  endDate: string;
  category: string;
  summary: string;
  details: string;
};

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function formatDateInputValue(value: string) {
  if (!value) {
    return "dd/mm/yyyy";
  }

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthGrid(monthCursor: Date) {
  const monthStart = startOfMonth(monthCursor);
  const gridStart = new Date(monthStart);
  const startDayOffset = (monthStart.getDay() + 6) % 7;
  gridStart.setDate(monthStart.getDate() - startDayOffset);

  return Array.from({ length: 42 }, (_unused, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function DatePickerField({
  label,
  value,
  onChange,
}: DatePickerFieldProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    if (!value) {
      return startOfMonth(new Date());
    }

    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? startOfMonth(new Date())
      : startOfMonth(parsed);
  });
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!value) {
      return;
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      setMonthCursor(startOfMonth(parsed));
    }
  }, [value]);

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(monthCursor);
  const weekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const monthGrid = buildMonthGrid(monthCursor);
  const activeMonth = monthCursor.getMonth();
  const activeValue = value;
  const todayValue = toDateValue(new Date());

  function moveMonth(direction: number) {
    setMonthCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function selectDate(date: Date) {
    onChange(toDateValue(date));
    setIsOpen(false);
  }

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div ref={shellRef} className={styles.datePickerShell}>
        <button
          type="button"
          className={styles.datePickerButton}
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
        >
          <span>{formatDateInputValue(value)}</span>
          <span className={styles.datePickerIcon} aria-hidden="true">
            <span className={styles.datePickerIconTop} />
            <span className={styles.datePickerIconGrid}>
              <span />
              <span />
              <span />
              <span />
            </span>
          </span>
        </button>
        {isOpen ? (
          <div className={styles.datePickerPopover}>
            <div className={styles.datePickerHeader}>
              <button
                type="button"
                className={styles.datePickerNav}
                onClick={() => moveMonth(-1)}
                aria-label="Previous month"
              >
                &larr;
              </button>
              <p className={styles.datePickerMonth}>{monthLabel}</p>
              <button
                type="button"
                className={styles.datePickerNav}
                onClick={() => moveMonth(1)}
                aria-label="Next month"
              >
                &rarr;
              </button>
            </div>
            <div className={styles.datePickerWeekdays}>
              {weekdayLabels.map((weekday) => (
                <span key={weekday} className={styles.datePickerWeekday}>
                  {weekday}
                </span>
              ))}
            </div>
            <div className={styles.datePickerGrid}>
              {monthGrid.map((date) => {
                const dateValue = toDateValue(date);
                const isOutsideMonth = date.getMonth() !== activeMonth;
                const isSelected = dateValue === activeValue;
                const isToday = dateValue === todayValue;

                return (
                  <button
                    key={dateValue}
                    type="button"
                    className={`${styles.datePickerDay} ${
                      isOutsideMonth ? styles.datePickerDayMuted : ""
                    } ${isSelected ? styles.datePickerDaySelected : ""} ${
                      isToday ? styles.datePickerDayToday : ""
                    }`}
                    onClick={() => selectDate(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
            <div className={styles.datePickerFooter}>
              <button
                type="button"
                className={styles.datePickerFooterButton}
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className={styles.datePickerFooterButton}
                onClick={() => selectDate(new Date())}
              >
                Today
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function formatEventDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Date unavailable";
  }

  const sameDay = startDate === endDate;
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(start);
  }

  if (sameMonth) {
    const monthLabel = new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "numeric",
    }).format(start);
    return `${start.getDate()} to ${end.getDate()} ${monthLabel}`;
  }

  if (sameYear) {
    const startLabel = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
    }).format(start);
    const endLabel = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(end);
    return `${startLabel} to ${endLabel}`;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(start)} to ${formatter.format(end)}`;
}

function groupEventsByMonth(events: EventRecord[]): EventMonthGroup[] {
  const groups = new Map<string, EventMonthGroup>();

  for (const event of events) {
    const date = new Date(`${event.startDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!groups.has(monthKey)) {
      groups.set(monthKey, {
        id: monthKey,
        label: new Intl.DateTimeFormat("en-GB", {
          month: "long",
          year: "numeric",
        }).format(date),
        events: [],
      });
    }

    groups.get(monthKey)?.events.push(event);
  }

  return Array.from(groups.values());
}

export default function CalendarPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [form, setForm] = useState<FormState>({
    title: "",
    startDate: "",
    endDate: "",
    category: "",
    summary: "",
    details: "",
  });
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStaffPanelOpen, setIsStaffPanelOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(`${authApiBaseUrl}/api/calendar`);

        if (!response.ok) {
          throw new Error(
            `Failed to load calendar events (${response.status}).`,
          );
        }

        const payload = await response.json();
        const parsedEvents = Array.isArray(payload.events)
          ? payload.events
          : [];

        if (!cancelled) {
          setEvents(parsedEvents);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load the calendar feed.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setIsAuthLoading(true);
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
          setIsAuthLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  async function refreshEvents() {
    const response = await fetch(`${authApiBaseUrl}/api/calendar`);

    if (!response.ok) {
      throw new Error(`Failed to load calendar events (${response.status}).`);
    }

    const payload = await response.json();
    setEvents(Array.isArray(payload.events) ? payload.events : []);
  }

  function resetForm() {
    setForm({
      title: "",
      startDate: "",
      endDate: "",
      category: "",
      summary: "",
      details: "",
    });
    setEditingEventId(null);
  }

  function beginEditingEvent(eventToEdit: EventRecord) {
    if (!eventToEdit.id) {
      return;
    }

    setEditingEventId(eventToEdit.id);
    setForm({
      title: eventToEdit.title ?? "",
      startDate: eventToEdit.startDate ?? "",
      endDate: eventToEdit.endDate ?? "",
      category: eventToEdit.category ?? "",
      summary: eventToEdit.summary ?? "",
      details: eventToEdit.details ?? "",
    });
    setFormMessage("");
    setFormError("");
    setIsStaffPanelOpen(true);
  }

  async function handleSubmitEvent(event) {
    event.preventDefault();
    setFormMessage("");
    setFormError("");

    try {
      setIsSubmitting(true);
      const isEditing = editingEventId !== null;
      const response = await fetch(
        isEditing
          ? `${authApiBaseUrl}/api/admin/calendar/${editingEventId}`
          : `${authApiBaseUrl}/api/admin/calendar`,
        {
          method: isEditing ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isEditing
              ? "Failed to update calendar event."
              : "Failed to create calendar event."),
        );
      }

      resetForm();
      await refreshEvents();
      setFormMessage(
        isEditing ? "Calendar event updated." : "Calendar event created.",
      );
      setIsStaffPanelOpen(true);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : editingEventId !== null
            ? "Failed to update calendar event."
            : "Failed to create calendar event.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateFormField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleDeleteEvent(eventId: number | undefined) {
    if (!eventId) {
      return;
    }

    setFormMessage("");
    setFormError("");

    try {
      setDeletingEventId(eventId);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/calendar/${eventId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete calendar event.");
      }

      if (editingEventId === eventId) {
        resetForm();
      }

      await refreshEvents();
      setFormMessage("Calendar event removed.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to delete calendar event.",
      );
    } finally {
      setDeletingEventId(null);
    }
  }

  const monthGroups = useMemo(() => groupEventsByMonth(events), [events]);
  const isStaff = Boolean(currentUser?.isStaff);
  const isEditing = editingEventId !== null;

  return (
    <Layout
      title="Calendar"
      description="Server events and multi-day date log for Reaches of Altharion."
    >
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Server Timeline</p>
              <Heading as="h1">Event Calendar</Heading>
              <p className={styles.heroText}>
                Upcoming and ongoing server events, managed directly inside the
                app by staff.
              </p>
            </div>
            {isStaff && !isAuthLoading ? (
              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={styles.staffToggle}
                  onClick={() => setIsStaffPanelOpen((current) => !current)}
                >
                  {isStaffPanelOpen ? "Close Event Manager" : "Manage Events"}
                </button>
              </div>
            ) : null}
          </section>

          <div
            className={`${styles.contentGrid} ${
              isStaff && isStaffPanelOpen ? styles.contentGridWithStaff : ""
            }`}
          >
            <div className={styles.timelineColumn}>
              {isLoading ? (
                <section className={styles.panel}>
                  <p className={styles.statusMessage}>Loading events...</p>
                </section>
              ) : null}

              {!isLoading && errorMessage ? (
                <section className={styles.panel}>
                  <p className={styles.errorMessage}>{errorMessage}</p>
                </section>
              ) : null}

              {!isLoading && !errorMessage && events.length === 0 ? (
                <section className={styles.panel}>
                  <p className={styles.statusMessage}>
                    No upcoming scheduled events.
                  </p>
                </section>
              ) : null}

              {!isLoading && !errorMessage && monthGroups.length > 0 ? (
                <div className={styles.monthStack}>
                  {monthGroups.map((group) => (
                    <section key={group.id} className={styles.monthSection}>
                      <div className={styles.monthHeader}>
                        <Heading as="h2">{group.label}</Heading>
                      </div>
                      <div className={styles.eventStack}>
                        {group.events.map((event) => (
                          <article
                            key={
                              event.id ??
                              `${event.title}-${event.startDate}-${event.endDate}`
                            }
                            className={styles.eventCard}
                          >
                            <div className={styles.eventCell}>
                              <p className={styles.eventDate}>
                                {formatEventDateRange(
                                  event.startDate,
                                  event.endDate,
                                )}
                              </p>
                            </div>
                            <div className={styles.eventCell}>
                              <Heading as="h3" className={styles.eventTitle}>
                                {event.title}
                              </Heading>
                            </div>
                            <div className={styles.eventCell}>
                              {event.category ? (
                                <span className={styles.eventCategory}>
                                  {event.category}
                                </span>
                              ) : (
                                <span className={styles.eventCategoryMuted}>
                                  -
                                </span>
                              )}
                            </div>
                            <div className={styles.eventCell}>
                              {event.summary ? (
                                <p className={styles.eventSummary}>
                                  {event.summary}
                                </p>
                              ) : (
                                <p className={styles.eventSummaryMuted}>-</p>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}
            </div>

            {isStaff && isStaffPanelOpen ? (
              <aside className={styles.staffSidebar}>
                <section className={styles.staffPanel}>
                  <div className={styles.staffPanelHeader}>
                    <div>
                      <p className={styles.staffEyebrow}>Staff Controls</p>
                      <Heading as="h2">Manage Calendar</Heading>
                    </div>
                  </div>
                  <div className={styles.staffSnapshot}>
                    <p className={styles.staffSnapshotLabel}>
                      Published events
                    </p>
                    <p className={styles.staffSnapshotValue}>{events.length}</p>
                  </div>
                  {events.length > 0 ? (
                    <div className={styles.staffEventPreview}>
                      <p className={styles.staffPreviewTitle}>
                        Current schedule
                      </p>
                      <div className={styles.staffPreviewList}>
                        {events.map((event) => (
                          <div
                            key={
                              event.id ??
                              `${event.title}-${event.startDate}-${event.endDate}`
                            }
                            className={styles.staffPreviewItem}
                          >
                            <div className={styles.staffPreviewItemCopy}>
                              <span className={styles.staffPreviewDate}>
                                {formatEventDateRange(
                                  event.startDate,
                                  event.endDate,
                                )}
                              </span>
                              <span className={styles.staffPreviewName}>
                                {event.title}
                              </span>
                            </div>
                            <div className={styles.staffPreviewActions}>
                              <button
                                type="button"
                                className={styles.editButton}
                                onClick={() => beginEditingEvent(event)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={styles.deleteButton}
                                disabled={deletingEventId === event.id}
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                {deletingEventId === event.id
                                  ? "Removing..."
                                  : "Remove"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.staffEmptyState}>
                      No published events yet. Your newly created event will
                      appear here immediately after save.
                    </div>
                  )}
                  <form className={styles.form} onSubmit={handleSubmitEvent}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Title</span>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(formEvent) =>
                          updateFormField("title", formEvent.target.value)
                        }
                        required
                        className={styles.input}
                      />
                    </label>
                    <div className={styles.row}>
                      <DatePickerField
                        label="Start Date"
                        value={form.startDate}
                        onChange={(value) =>
                          updateFormField("startDate", value)
                        }
                      />
                      <DatePickerField
                        label="End Date"
                        value={form.endDate}
                        onChange={(value) => updateFormField("endDate", value)}
                      />
                    </div>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Category</span>
                      <input
                        type="text"
                        value={form.category}
                        onChange={(formEvent) =>
                          updateFormField("category", formEvent.target.value)
                        }
                        className={styles.input}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Summary</span>
                      <textarea
                        value={form.summary}
                        onChange={(formEvent) =>
                          updateFormField("summary", formEvent.target.value)
                        }
                        className={styles.textarea}
                        rows={3}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Details</span>
                      <textarea
                        value={form.details}
                        onChange={(formEvent) =>
                          updateFormField("details", formEvent.target.value)
                        }
                        className={styles.textarea}
                        rows={5}
                      />
                    </label>
                    {formMessage ? (
                      <p className={styles.successMessage}>{formMessage}</p>
                    ) : null}
                    {formError ? (
                      <p className={styles.errorMessage}>{formError}</p>
                    ) : null}
                    <div className={styles.formActions}>
                      {isEditing ? (
                        <button
                          type="button"
                          className={styles.secondaryActionButton}
                          onClick={resetForm}
                        >
                          Cancel Edit
                        </button>
                      ) : null}
                      <button
                        type="submit"
                        className={styles.actionButton}
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? isEditing
                            ? "Saving..."
                            : "Creating..."
                          : isEditing
                            ? "Save Changes"
                            : "Create Event"}
                      </button>
                    </div>
                  </form>
                </section>
              </aside>
            ) : null}
          </div>
        </div>
      </main>
    </Layout>
  );
}
