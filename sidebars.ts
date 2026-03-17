import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: "category",
      label: "Player Information",
      collapsible: true,
      collapsed: false,
      items: ["getting-set-up", "sourcebooks", "transformations"],
    },
    "dm-rules",
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
        "homebrew/subclasses",
        "homebrew/spells",
      ],
    },
  ],
};

export default sidebars;
