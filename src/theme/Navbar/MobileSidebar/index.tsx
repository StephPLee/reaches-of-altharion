import type { ReactNode } from "react";

import Link from "@docusaurus/Link";
import { translate } from "@docusaurus/Translate";
import {
  useLockBodyScroll,
  useNavbarMobileSidebar,
} from "@docusaurus/theme-common/internal";
import IconClose from "@theme/Icon/Close";
import NavbarLogo from "@theme/Navbar/Logo";

const NAV_GROUPS = [
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
    ],
  },
];

function CloseButton() {
  const mobileSidebar = useNavbarMobileSidebar();

  return (
    <button
      type="button"
      aria-label={translate({
        id: "theme.docs.sidebar.closeSidebarButtonAriaLabel",
        message: "Close navigation bar",
        description: "The ARIA label for close button of mobile sidebar",
      })}
      className="clean-btn navbar-sidebar__close"
      onClick={() => mobileSidebar.toggle()}
    >
      <IconClose color="var(--ifm-color-emphasis-600)" />
    </button>
  );
}

export default function NavbarMobileSidebar(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();

  useLockBodyScroll(mobileSidebar.shown);

  if (!mobileSidebar.shouldRender) {
    return null;
  }

  return (
    <div className="navbar-sidebar mobile-manual-sidebar">
      <div className="navbar-sidebar__brand">
        <NavbarLogo />
        <CloseButton />
      </div>
      <div className="navbar-sidebar__items">
        <div className="navbar-sidebar__item menu">
          <div className="mobile-primary-nav">
            {NAV_GROUPS.map((group) => (
              <div
                key={group.title ?? "primary"}
                className="mobile-primary-nav__group"
              >
                {group.title ? (
                  <p className="mobile-primary-nav__heading">{group.title}</p>
                ) : null}
                <div className="mobile-primary-nav__links">
                  {group.links.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="mobile-primary-nav__link"
                      onClick={() => mobileSidebar.toggle()}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
