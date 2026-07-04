import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import isInternalUrl from "@docusaurus/isInternalUrl";
import { isRegexpStringMatch } from "@docusaurus/theme-common";
import IconExternalLink from "@theme/Icon/ExternalLink";
import type { Props } from "@theme/NavbarItem/NavbarNavLink";

// Swizzled from @docusaurus/theme-classic to fix active-link matching for
// links like `/?view=world`: the default NavLink matching only compares
// pathname, so every `/?view=...` item lit up as active on any `/` view.
export default function NavbarNavLink({
  activeBasePath,
  activeBaseRegex,
  to,
  href,
  label,
  html,
  isDropdownLink,
  prependBaseUrlToHref,
  ...props
}: Props): ReactNode {
  const toUrl = useBaseUrl(to);
  const activeBaseUrl = useBaseUrl(activeBasePath);
  const normalizedHref = useBaseUrl(href, { forcePrependBaseUrl: true });
  const isExternalLink = label && href && !isInternalUrl(href);

  const linkContentProps = html
    ? { dangerouslySetInnerHTML: { __html: html } }
    : {
        children: (
          <>
            {label}
            {isExternalLink && (
              <IconExternalLink
                {...(isDropdownLink && { width: 12, height: 12 })}
              />
            )}
          </>
        ),
      };

  if (href) {
    return (
      <Link
        href={prependBaseUrlToHref ? normalizedHref : href}
        {...props}
        {...linkContentProps}
      />
    );
  }

  const toSearch = toUrl.includes("?") ? toUrl.slice(toUrl.indexOf("?")) : "";

  const isActive = activeBaseRegex
    ? (_match: unknown, location: { pathname: string }) =>
        isRegexpStringMatch(activeBaseRegex, location.pathname)
    : activeBasePath
      ? (_match: unknown, location: { pathname: string }) =>
          location.pathname.startsWith(activeBaseUrl)
      : toSearch
        ? (_match: unknown, location: { search: string }) => {
            const toParams = new URLSearchParams(toSearch);
            const locationParams = new URLSearchParams(location.search);
            for (const [key, value] of toParams) {
              if (locationParams.get(key) !== value) {
                return false;
              }
            }
            return true;
          }
        : undefined;

  return (
    <Link
      to={toUrl}
      isNavLink
      {...(isActive && { isActive })}
      {...props}
      {...linkContentProps}
    />
  );
}
