import type { ReactNode } from "react";

import clsx from "clsx";
import { translate } from "@docusaurus/Translate";
import { ThemeClassNames, useThemeConfig } from "@docusaurus/theme-common";
import { useHideableNavbar } from "@docusaurus/theme-common/internal";

export default function NavbarLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const {
    navbar: { hideOnScroll, style },
  } = useThemeConfig();
  const { navbarRef, isNavbarVisible } = useHideableNavbar(hideOnScroll);

  return (
    <nav
      ref={navbarRef}
      aria-label={translate({
        id: "theme.NavBar.navAriaLabel",
        message: "Main",
        description: "The ARIA label for the main navigation",
      })}
      className={clsx(
        ThemeClassNames.layout.navbar.container,
        "navbar",
        "navbar--fixed-top",
        hideOnScroll && !isNavbarVisible && "navbar--hideable-hidden",
        {
          "navbar--dark": style === "dark",
          "navbar--primary": style === "primary",
        },
      )}
    >
      {children}
    </nav>
  );
}
