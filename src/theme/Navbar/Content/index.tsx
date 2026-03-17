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

const MOBILE_NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    links: [
      { label: "Home", to: "/?view=map" },
      { label: "DM Rules", to: "/docs/dm-rules" },
      { label: "RP Rules", to: "/docs/rp-rules" },
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
];

function useNavbarItems() {
  return useThemeConfig().navbar.items;
}

function NavbarItems({ items }): ReactNode {
  return (
    <>
      {items.map((item, index) => (
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
      ))}
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

export default function NavbarContent(): ReactNode {
  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

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
            <NavbarItems items={leftItems} />
            <NavbarItems items={rightItems} />
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
