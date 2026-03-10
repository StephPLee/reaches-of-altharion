import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: "category",
      label: "Character Creation",
      collapsible: true,
      collapsed: false,
      items: [
        "getting-set-up",
        "creating-your-character",
        "submitting-your-character",
      ],
    },
    {
      type: "category",
      label: "DM Rules",
      collapsible: true,
      collapsed: false,
      items: ["dm-rules"],
    },
  ],
};

export default sidebars;
