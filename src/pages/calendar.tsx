import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./calendar.module.css";

const CALENDAR_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmE9dY_gzDg786mddTLn-RU_FzDWEr-OaRkSOo6oZBEHpbfY1QFc0SkI1fbzhDYTB5u1Mn7Z3YvAzK/pub?gid=0&single=true&output=csv";

type EventRecord = {
  title: string;
  startDate: string;
  endDate: string;
  category: string;
  summary: string;
};

type EventMonthGroup = {
  id: string;
  label: string;
  events: EventRecord[];
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue !== "" || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim() !== ""));
}

function buildEvents(csvText: string) {
  const [headerRow, ...dataRows] = parseCsv(csvText);

  if (!headerRow) {
    return [];
  }

  const headerIndex = new Map(
    headerRow.map((header, index) => [normalizeHeader(header), index]),
  );

  const getValue = (row: string[], name: string) =>
    row[headerIndex.get(name) ?? -1]?.trim() ?? "";

  return dataRows
    .map((row) => ({
      title: getValue(row, "title"),
      startDate: getValue(row, "start_date"),
      endDate: getValue(row, "end_date"),
      category: getValue(row, "category"),
      summary: getValue(row, "summary"),
    }))
    .filter((event) => event.title && event.startDate && event.endDate)
    .sort((left, right) => {
      const leftTimestamp = Date.parse(left.startDate);
      const rightTimestamp = Date.parse(right.startDate);
      return leftTimestamp - rightTimestamp;
    });
}

function formatEventDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
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
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(CALENDAR_CSV_URL);

        if (!response.ok) {
          throw new Error(`Failed to load calendar feed (${response.status}).`);
        }

        const csvText = await response.text();
        const parsedEvents = buildEvents(csvText);

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
  }, []);

  const monthGroups = useMemo(() => groupEventsByMonth(events), [events]);

  return (
    <Layout
      title="Calendar"
      description="Server events and multi-day date log for Reaches of Altharion."
    >
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Server Timeline</p>
            <Heading as="h1">Event Calendar</Heading>
            <p className={styles.heroText}>
              Upcoming and ongoing server events, pulled directly from the
              admin-maintained Google Sheet.
            </p>
          </section>

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
                No events are currently listed in the external calendar.
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
                        key={`${event.title}-${event.startDate}-${event.endDate}`}
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
                            <span className={styles.eventCategoryMuted}>-</span>
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
      </main>
    </Layout>
  );
}
