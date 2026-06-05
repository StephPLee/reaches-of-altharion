import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { useLocation } from "@docusaurus/router";
import DocSidebar from "@theme/DocSidebar";

import styles from "./ToolsSidebarFrame.module.css";

type ToolsSidebarFrameProps = {
  children: ReactNode;
  sidebarOffset?: string;
};

type SidebarItem = {
  type: "category" | "link";
  label: string;
  href?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  items?: SidebarItem[];
};

const SIDEBAR: SidebarItem[] = [
  {
    type: "category",
    label: "Player Information",
    collapsible: true,
    collapsed: false,
    items: [
      { type: "link", label: "Character Creation", href: "/docs/getting-set-up" },
      { type: "link", label: "FAQ", href: "/docs/faq" },
      { type: "link", label: "Sourcebooks", href: "/docs/sourcebooks" },
      { type: "link", label: "Banned Content", href: "/docs/banned-content" },
      { type: "link", label: "Transformations", href: "/docs/transformations" },
    ],
  },
  {
    type: "category",
    label: "DM Information",
    collapsible: true,
    collapsed: false,
    items: [
      { type: "link", label: "DM Rules", href: "/docs/dm-rules" },
      { type: "link", label: "Homebrew Guidelines", href: "/docs/homebrew-guidelines" },
    ],
  },
  { type: "link", label: "RP Rules", href: "/docs/rp-rules" },
  {
    type: "category",
    label: "Homebrew",
    collapsible: true,
    collapsed: false,
    items: [
      { type: "link", label: "Starting Graces", href: "/docs/homebrew/starting-graces" },
      { type: "link", label: "Boons", href: "/docs/homebrew/boons" },
      { type: "link", label: "Guilds", href: "/docs/homebrew/guilds" },
      { type: "link", label: "Weapons", href: "/docs/homebrew/weapons" },
      { type: "link", label: "Wondrous Items", href: "/docs/homebrew/wondrous-items" },
      { type: "link", label: "Species", href: "/docs/homebrew/species" },
      { type: "link", label: "Feats", href: "/docs/homebrew/feats" },
      { type: "link", label: "Subclasses", href: "/docs/homebrew/subclasses" },
      { type: "link", label: "Spells", href: "/docs/homebrew/spells" },
    ],
  },
  {
    type: "category",
    label: "Tools",
    collapsible: true,
    collapsed: false,
    items: [
      { type: "link", label: "Avrae Commands", href: "/avrae" },
      { type: "link", label: "Rewards Calculator", href: "/rewards-calculator" },
      { type: "link", label: "Stellar Coin Conversion", href: "/stellar-coin-conversion" },
      { type: "link", label: "Stat Rolls", href: "/stat-rolls" },
    ],
  },
];

type DocSidebarItems = ComponentProps<typeof DocSidebar>["sidebar"];

export default function ToolsSidebarFrame({
  children,
  sidebarOffset = "0rem",
}: ToolsSidebarFrameProps) {
  const location = useLocation();

  return (
    <div
      className={`${styles.frame} docs-wrapper`}
      style={{ "--tools-sidebar-offset": sidebarOffset } as CSSProperties}
    >
      <aside className={styles.sidebarContainer}>
        <div className={styles.sidebarViewport}>
          <DocSidebar
            sidebar={SIDEBAR as unknown as DocSidebarItems}
            path={location.pathname}
            onCollapse={() => {}}
            isHidden={false}
          />
        </div>
      </aside>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
