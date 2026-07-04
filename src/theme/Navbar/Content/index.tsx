import type { ReactNode } from "react";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
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

type AuthUser = {
  username: string;
  globalName: string | null;
  isStaff: boolean;
  isDm?: boolean;
  canSubmitRewards?: boolean;
};

const CALENDAR_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmE9dY_gzDg786mddTLn-RU_FzDWEr-OaRkSOo6oZBEHpbfY1QFc0SkI1fbzhDYTB5u1Mn7Z3YvAzK/pub?gid=0&single=true&output=csv";

const MOBILE_NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    links: [
      { label: "Home", to: "/?view=map" },
      { label: "RP Rules", to: "/docs/rp-rules" },
      { label: "Calendar", to: "/calendar" },
    ],
  },
  {
    title: "The World of Altharion",
    links: [
      { label: "World Map", to: "/?view=world" },
      { label: "Guild Lore", to: "/docs/world/guild-lore" },
    ],
  },
  {
    title: "Player Information",
    links: [
      { label: "Character Creation", to: "/character-creation" },
      { label: "FAQ", to: "/docs/faq" },
      { label: "Sourcebooks", to: "/docs/sourcebooks" },
      { label: "Banned Content", to: "/docs/banned-content" },
      { label: "Transformations", to: "/docs/transformations" },
      { label: "Character Attributes", to: "/character-attributes" },
    ],
  },
  {
    title: "DM Information",
    links: [
      { label: "DM Rules", to: "/docs/dm-rules" },
      { label: "Homebrew Guidelines", to: "/docs/homebrew-guidelines" },
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
    title: "Tools",
    links: [
      { label: "Stat Rolls", to: "/stat-rolls" },
      { label: "Avrae Commands", to: "/avrae" },
      { label: "Rewards Calculator", to: "/rewards-calculator" },
      { label: "Stellar Coin Conversion", to: "/stellar-coin-conversion" },
    ],
  },
];

function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function getDiscordInviteUrl(siteConfig): string {
  const configuredInviteUrl = siteConfig.customFields?.discordInviteUrl;
  return typeof configuredInviteUrl === "string" ? configuredInviteUrl.trim() : "";
}

function getAuthErrorMessage(code: string | null) {
  switch (code) {
    case "staff_only":
      return "You do not have permission to open that tool.";
    case "not_in_server":
      return "You must be in the Discord server before you can sign in.";
    case "discord_denied":
      return "Discord sign-in was cancelled or denied.";
    case "login_failed":
      return "Discord sign-in failed. Please try again.";
    default:
      return "";
  }
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
    <div className="navbar__item dropdown dropdown--hoverable custom-calendar-nav-item">
      <Link
        to="/calendar"
        className={`navbar__link custom-calendar-nav-link${
          isActive ? " navbar__link--active" : ""
        }`}
      >
        Calendar
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

function DiscordIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      className="custom-discord-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.522 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286ZM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189Zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

function DiscordInviteLink({
  inviteUrl,
  isMobile = false,
  onNavigate,
}: {
  inviteUrl: string;
  isMobile?: boolean;
  onNavigate?: () => void;
}): ReactNode {
  if (!inviteUrl) {
    return null;
  }

  return (
    <a
      href={inviteUrl}
      className={clsx(
        isMobile
          ? "custom-mobile-discord-link"
          : "navbar__item custom-navbar-discord-link",
      )}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
    >
      <DiscordIcon />
      Join Discord
    </a>
  );
}

function NavbarAuthControls({
  apiBaseUrl,
  discordInviteUrl = "",
  isMobile = false,
  onNavigate,
}: {
  apiBaseUrl: string;
  discordInviteUrl?: string;
  isMobile?: boolean;
  onNavigate?: () => void;
}): ReactNode {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setIsLoading(true);
        const response = await fetch(`${apiBaseUrl}/api/me`, {
          credentials: "include",
        });

        if (response.status === 401) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load auth session (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setUser(payload.authenticated ? payload.user : null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
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
  }, [apiBaseUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const message = getAuthErrorMessage(url.searchParams.get("authError"));

    if (!message) {
      return;
    }

    setAuthNotice(message);
    url.searchParams.delete("authError");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [location.key]);

  async function handleLogout() {
    try {
      setIsSubmitting(true);
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      onNavigate?.();
      const returnTo =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      window.location.href =
        window.location.pathname === "/admin" ? "/?view=map" : returnTo;
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogin() {
    onNavigate?.();
    const returnTo =
      window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `${apiBaseUrl}/auth/discord/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  if (isLoading) {
    return (
      <>
        {authNotice ? (
          <div
            className={clsx(
              isMobile
                ? "custom-mobile-auth-notice"
                : "custom-navbar-auth-notice",
            )}
          >
            <span>{authNotice}</span>
            <button
              type="button"
              className="clean-btn custom-auth-notice__close"
              onClick={() => setAuthNotice("")}
              aria-label="Dismiss sign-in notice"
            >
              ×
            </button>
          </div>
        ) : null}
        <span
          className={clsx(
            isMobile
              ? "custom-mobile-auth-status"
              : "navbar__item custom-navbar-auth-status",
          )}
        >
          Checking sign-in...
        </span>
      </>
    );
  }

  if (!user) {
    return (
      <>
        {authNotice ? (
          <div
            className={clsx(
              isMobile
                ? "custom-mobile-auth-notice"
                : "custom-navbar-auth-notice",
            )}
          >
            <span>{authNotice}</span>
            <button
              type="button"
              className="clean-btn custom-auth-notice__close"
              onClick={() => setAuthNotice("")}
              aria-label="Dismiss sign-in notice"
            >
              ×
            </button>
          </div>
        ) : null}
        {isMobile ? (
          <button
            type="button"
            className="clean-btn custom-mobile-auth-button"
            onClick={handleLogin}
          >
            <DiscordIcon />
            Discord Login
          </button>
        ) : (
          <div className="navbar__item custom-navbar-discord-shell">
            <span className="custom-navbar-discord-shell__icon">
              <DiscordIcon />
            </span>
            {discordInviteUrl ? (
              <a
                href={discordInviteUrl}
                className="custom-navbar-discord-shell__action"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join
              </a>
            ) : null}
            {discordInviteUrl ? (
              <span
                className="custom-navbar-discord-shell__divider"
                aria-hidden="true"
              />
            ) : null}
            <button
              type="button"
              className="clean-btn custom-navbar-discord-shell__action"
              onClick={handleLogin}
            >
              Sign in
            </button>
          </div>
        )}
      </>
    );
  }

  const displayName = user.globalName || user.username;

  return (
    <>
      {authNotice ? (
        <div
          className={clsx(
            isMobile
              ? "custom-mobile-auth-notice"
              : "custom-navbar-auth-notice",
          )}
        >
          <span>{authNotice}</span>
          <button
            type="button"
            className="clean-btn custom-auth-notice__close"
            onClick={() => setAuthNotice("")}
            aria-label="Dismiss sign-in notice"
          >
            ×
          </button>
        </div>
      ) : null}
      {isMobile ? (
        <div className="custom-mobile-auth-shell">
          <span className="custom-mobile-auth-label">{displayName}</span>
          {user.isStaff ? (
            <Link
              to="/admin"
              className="custom-mobile-auth-link"
              onClick={onNavigate}
            >
              Staff Panel
            </Link>
          ) : null}
          <button
            type="button"
            className="clean-btn custom-mobile-auth-link"
            onClick={handleLogout}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      ) : (
        <div className="navbar__item custom-navbar-account-shell">
          <span className="custom-navbar-account-shell__label">
            {displayName}
          </span>
          {user.isStaff ? (
            <>
              <span
                className="custom-navbar-account-shell__divider"
                aria-hidden="true"
              />
              <Link
                to="/admin"
                className="custom-navbar-account-shell__action"
                onClick={onNavigate}
              >
                Staff Panel
              </Link>
            </>
          ) : null}
          <span
            className="custom-navbar-account-shell__divider"
            aria-hidden="true"
          />
          <button
            type="button"
            className="custom-navbar-account-shell__action"
            onClick={handleLogout}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      )}
    </>
  );
}

export default function NavbarContent(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const isCalendarActive = location.pathname === "/calendar";
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const discordInviteUrl = getDiscordInviteUrl(siteConfig);

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
        </div>

        <div className="navbar__items navbar__items--center custom-navbar-center">
          <NavbarItems items={leftItems} isCalendarActive={isCalendarActive} />
          <NavbarItems items={rightItems} isCalendarActive={isCalendarActive} />
        </div>

        <div
          className={clsx(
            ThemeClassNames.layout.navbar.containerRight,
            "navbar__items navbar__items--right",
          )}
        >
          <NavbarAuthControls
            apiBaseUrl={authApiBaseUrl}
            discordInviteUrl={discordInviteUrl}
          />
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
                  <div className="custom-mobile-menu-group">
                    <p className="custom-mobile-menu-group__title">Community</p>
                    <div className="custom-mobile-menu-group__links">
                      <DiscordInviteLink
                        inviteUrl={discordInviteUrl}
                        isMobile
                        onNavigate={() => setIsMobileMenuOpen(false)}
                      />
                    </div>
                  </div>
                  <div className="custom-mobile-menu-group">
                    <p className="custom-mobile-menu-group__title">Staff</p>
                    <NavbarAuthControls
                      apiBaseUrl={authApiBaseUrl}
                      isMobile
                      onNavigate={() => setIsMobileMenuOpen(false)}
                    />
                  </div>
                </div>
              </div>
            </>,
            portalTarget,
          )
        : null}
    </>
  );
}
