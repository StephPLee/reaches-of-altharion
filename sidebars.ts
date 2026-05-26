import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: "category",
      label: "Player Information",
      collapsible: true,
      collapsed: false,
      items: ["getting-set-up", "faq", "sourcebooks", "banned-content", "transformations"],
    },
    {
      type: "category",
      label: "DM Information",
      collapsible: true,
      collapsed: false,
      items: ["dm-rules", "homebrew-guidelines"],
    },
    "rp-rules",
    {
      type: "category",
      label: "Homebrew",
      collapsible: true,
      collapsed: false,
      items: [
        "homebrew/starting-graces",
        "homebrew/boons",
        "homebrew/guilds",
        "homebrew/weapons",
        "homebrew/wondrous-items",
        "homebrew/species",
        "homebrew/feats",
        "homebrew/subclasses",
        "homebrew/spells",
      ],
    },
    {
      type: "category",
      label: "Tools",
      collapsible: true,
      collapsed: false,
      items: [
        {
          type: "link",
          label: "Avrae Commands",
          href: "/avrae",
        },
        {
          type: "link",
          label: "Rewards Calculator",
          href: "/rewards-calculator",
        },
        {
          type: "link",
          label: "Stellar Coin Conversion",
          href: "/stellar-coin-conversion",
        },
      ],
    },
  ],
};

export default sidebars;
