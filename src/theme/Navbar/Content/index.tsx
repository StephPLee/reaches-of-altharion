import type { ReactNode } from "react";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import {
  ErrorCauseBoundary,
  ThemeClassNames,
  useThemeConfig,
} from "@docusaurus/theme-common";
import { splitNavbarItems } from "@docusaurus/theme-common/internal";
import { createPortal } from "react-dom";
import NavbarItem from "@theme/NavbarItem";
import NavbarLogo from "@theme/Navbar/Logo";

type NavGroup = {
  title: string | null;
  links: Array<{ label: string; to: string }>;
};

type CalendarPreviewEvent = {
  title: string;
  startDate: string;
  endDate: string;
  category: string;
};

const CALENDAR_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmE9dY_gzDg786mddTLn-RU_FzDWEr-OaRkSOo6oZBEHpbfY1QFc0SkI1fbzhDYTB5u1Mn7Z3YvAzK/pub?gid=0&single=true&output=csv";

const MOBILE_NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    links: [
      { label: "Home", to: "/?view=map" },
      { label: "DM Rules", to: "/docs/dm-rules" },
      { label: "RP Rules", to: "/docs/rp-rules" },
      { label: "Calendar", to: "/calendar" },
      { label: "The World of Altharion", to: "/?view=world" },
    ],
  },
  {
    title: "Player Information",
    links: [
      { label: "Character Creation", to: "/docs/getting-set-up" },
      { label: "Sourcebooks", to: "/docs/sourcebooks" },
      { label: "Transformations", to: "/docs/transformations" },
    ],
  },
  {
    title: "Homebrew",
    links: [
      { label: "Starting Graces", to: "/docs/homebrew/starting-graces" },
      { label: "Boons", to: "/docs/homebrew/boons" },
      { label: "Guilds", to: "/docs/homebrew/guilds" },
      { label: "Weapons", to: "/docs/homebrew/weapons" },
      { label: "Wondrous Items", to: "/docs/homebrew/wondrous-items" },
      { label: "Species", to: "/docs/homebrew/species" },
      { label: "Subclasses", to: "/docs/homebrew/subclasses" },
      { label: "Spells", to: "/docs/homebrew/spells" },
    ],
  },
  {
    title: "Calculators",
    links: [{ label: "Rewards Calculator", to: "/rewards-calculator" }],
  },
];

function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

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

function buildPreviewEvents(csvText: string) {
  const [headerRow, ...dataRows] = parseCsv(csvText);

  if (!headerRow) {
    return [];
  }

  const headerIndex = new Map(
    headerRow.map((header, index) => [normalizeHeader(header), index]),
  );

  const getValue = (row: string[], name: string) =>
    row[headerIndex.get(name) ?? -1]?.trim() ?? "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dataRows
    .map((row) => ({
      title: getValue(row, "title"),
      startDate: getValue(row, "start_date"),
      endDate: getValue(row, "end_date"),
      category: getValue(row, "category"),
    }))
    .filter((event) => event.title && event.startDate && event.endDate)
    .filter((event) => new Date(`${event.endDate}T00:00:00`) >= today)
    .sort(
      (left, right) => Date.parse(left.startDate) - Date.parse(right.startDate),
    )
    .slice(0, 5);
}

function formatPreviewDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (startDate === endDate) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
    }).format(start);
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(end);

  return `${startLabel} to ${endLabel}`;
}

function isCalendarItem(item) {
  return item?.to === "/calendar";
}

function NavbarItems({ items, isCalendarActive }): ReactNode {
  return (
    <>
      {items.map((item, index) =>
        isCalendarItem(item) ? (
          <CalendarPreviewLink
            key={item.to ?? index}
            isActive={isCalendarActive}
          />
        ) : (
          <ErrorCauseBoundary
            key={index}
            onError={(error) =>
              new Error(
                `A theme navbar item failed to render.\n${JSON.stringify(item, null, 2)}`,
                { cause: error },
              )
            }
          >
            <NavbarItem {...item} />
          </ErrorCauseBoundary>
        ),
      )}
    </>
  );
}

function MobileMenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      className="clean-btn custom-mobile-menu-toggle"
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={isOpen}
      onClick={onClick}
    >
      <span className="custom-mobile-menu-toggle__bar" />
      <span className="custom-mobile-menu-toggle__bar" />
      <span className="custom-mobile-menu-toggle__bar" />
    </button>
  );
}

function CalendarPreviewLink({ isActive }: { isActive: boolean }): ReactNode {
  const [events, setEvents] = useState<CalendarPreviewEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        setIsLoading(true);
        setHasError(false);

        const response = await fetch(CALENDAR_CSV_URL);

        if (!response.ok) {
          throw new Error(`Failed to load calendar feed (${response.status}).`);
        }

        const csvText = await response.text();
        const parsedEvents = buildPreviewEvents(csvText);

        if (!cancelled) {
          setEvents(parsedEvents);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
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

  return (
    <div className="navbar__item custom-calendar-nav-item">
      <Link
        to="/calendar"
        className={`navbar__link custom-calendar-nav-link${
          isActive ? " navbar__link--active" : ""
        }`}
      >
        Calendar
        <span className="custom-calendar-nav-link__caret" aria-hidden="true" />
      </Link>
      <div className="custom-calendar-preview" role="presentation">
        <div className="custom-calendar-preview__panel">
          <p className="custom-calendar-preview__eyebrow">Upcoming Events</p>
          {isLoading ? (
            <p className="custom-calendar-preview__status">Loading...</p>
          ) : null}
          {!isLoading && hasError ? (
            <p className="custom-calendar-preview__status">
              Calendar preview unavailable.
            </p>
          ) : null}
          {!isLoading && !hasError && events.length === 0 ? (
            <p className="custom-calendar-preview__status">
              No upcoming events listed.
            </p>
          ) : null}
          {!isLoading && !hasError && events.length > 0 ? (
            <div className="custom-calendar-preview__list">
              {events.map((event) => (
                <Link
                  key={`${event.title}-${event.startDate}-${event.endDate}`}
                  to="/calendar"
                  className="custom-calendar-preview__item"
                >
                  <span className="custom-calendar-preview__date">
                    {formatPreviewDateRange(event.startDate, event.endDate)}
                  </span>
                  <span className="custom-calendar-preview__title">
                    {event.title}
                  </span>
                  {event.category ? (
                    <span className="custom-calendar-preview__category">
                      {event.category}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
          <Link to="/calendar" className="custom-calendar-preview__cta">
            View full calendar
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function NavbarContent(): ReactNode {
  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const isCalendarActive = location.pathname === "/calendar";

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <div className="navbar__inner">
        <div
          className={clsx(
            ThemeClassNames.layout.navbar.containerLeft,
            "navbar__items",
          )}
        >
          <MobileMenuButton
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((value) => !value)}
          />
          <NavbarLogo />
          <div className="custom-navbar-desktop">
            <NavbarItems
              items={leftItems}
              isCalendarActive={isCalendarActive}
            />
            <NavbarItems
              items={rightItems}
              isCalendarActive={isCalendarActive}
            />
          </div>
        </div>
      </div>

      {isMobileMenuOpen && portalTarget
        ? createPortal(
            <>
              <button
                type="button"
                className="clean-btn custom-mobile-menu-backdrop"
                aria-label="Close navigation menu"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="custom-mobile-menu-drawer">
                <div className="custom-mobile-menu-drawer__header">
                  <NavbarLogo />
                  <button
                    type="button"
                    className="clean-btn custom-mobile-menu-close"
                    aria-label="Close navigation menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="custom-mobile-menu-drawer__body">
                  {MOBILE_NAV_GROUPS.map((group) => (
                    <div
                      key={group.title ?? "primary"}
                      className="custom-mobile-menu-group"
                    >
                      {group.title ? (
                        <p className="custom-mobile-menu-group__title">
                          {group.title}
                        </p>
                      ) : null}
                      <div className="custom-mobile-menu-group__links">
                        {group.links.map((link) => {
                          const isActive =
                            location.pathname === link.to ||
                            `${location.pathname}${location.search}` ===
                              link.to;

                          return (
                            <Link
                              key={link.to}
                              to={link.to}
                              className={`custom-mobile-menu-link${
                                isActive
                                  ? " custom-mobile-menu-link--active"
                                  : ""
                              }`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>,
            portalTarget,
          )
        : null}
    </>
  );
}
