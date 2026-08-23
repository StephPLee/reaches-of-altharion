import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import "dotenv/config";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Reaches of Altharion",
  tagline: "D&D 5.5e Westmarch Server",
  favicon: "img/A logo gold.ico",
  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "manifest",
        href: "/manifest.webmanifest",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "apple-touch-icon",
        href: "/img/app-icon-192.png",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "theme-color",
        content: "#080a1a",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "apple-mobile-web-app-title",
        content: "Altharion",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
    },
  ],
  customFields: {
    authApiBaseUrl: process.env.CLIENT_AUTH_API_BASE_URL || "",
    discordInviteUrl: process.env.CLIENT_DISCORD_INVITE_URL || "",
  },

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://reachesofaltharion.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "Reaches of Altharion", // Usually your GitHub org/user name.
  projectName: "reaches-of-altharion", // Usually your repo name.

  onBrokenLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: false,
          breadcrumbs: false,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    function localAuthProxyPlugin(): any {
      return {
        name: "local-auth-proxy-plugin",
        configureWebpack() {
          if (process.env.NODE_ENV !== "development") {
            return undefined;
          }

          return {
            devServer: {
              proxy: [
                {
                  context: ["/auth", "/api", "/health", "/uploads"],
                  target:
                    process.env.DEV_AUTH_PROXY_TARGET ||
                    "http://127.0.0.1:3001",
                  changeOrigin: true,
                  secure: false,
                },
              ],
            },
          } as any;
        },
      };
    },
  ],

  themeConfig: {
    image: "img/altharion-no-frame.png",
    docs: {
      sidebar: {
        hideable: false,
      },
    },
    colorMode: {
      defaultMode: "dark",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: "Reaches of Altharion",
      logo: {
        alt: "Reaches of Altharion Logo",
        src: "img/A%20logo%20gold.png",
        href: "/?view=map",
      },
      items: [
        { to: "/?view=map", label: "Home", position: "left" },
        {
          to: "/player-information",
          label: "Player Information",
          position: "left",
          items: [
            {
              to: "/character-creation",
              label: "Character Creation",
            },
            {
              to: "/docs/faq",
              label: "FAQ",
            },
            {
              to: "/docs/sourcebooks",
              label: "Sourcebooks",
            },
            {
              to: "/docs/banned-content",
              label: "Banned Content",
            },
            {
              to: "/docs/transformations",
              label: "Transformations",
            },
            {
              to: "/book-requests",
              label: "Book Requests",
            },
            {
              to: "/feedback",
              label: "Feedback",
            },
            {
              to: "/character-attributes",
              label: "Server Stats",
            },
          ],
        },
        {
          to: "/dm-information",
          label: "DM Information",
          position: "left",
          items: [
            {
              to: "/docs/dm-rules",
              label: "DM Rules",
            },
            {
              to: "/docs/homebrew-guidelines",
              label: "Homebrew Guidelines",
            },
          ],
        },
        {
          to: "/docs/rp-rules",
          label: "RP Rules",
          position: "left",
        },
        {
          to: "/homebrew",
          label: "Homebrew",
          position: "left",
          items: [
            {
              to: "/docs/homebrew/starting-graces",
              label: "Starting Graces",
            },
            {
              to: "/docs/homebrew/boons",
              label: "Boons",
            },
            {
              to: "/docs/homebrew/guilds",
              label: "Guilds",
            },
            {
              to: "/docs/homebrew/weapons",
              label: "Weapons",
            },
            {
              to: "/docs/homebrew/wondrous-items",
              label: "Wondrous Items",
            },
            {
              to: "/docs/homebrew/species",
              label: "Species",
            },
            {
              to: "/docs/homebrew/feats",
              label: "Feats",
            },
            {
              to: "/docs/homebrew/subclasses",
              label: "Subclasses",
            },
            {
              to: "/docs/homebrew/spells",
              label: "Spells",
            },
          ],
        },
        {
          to: "/calendar",
          label: "Calendar",
          position: "left",
        },
        {
          to: "/tools",
          label: "Tools",
          position: "left",
          items: [
            {
              to: "/avrae",
              label: "Avrae Commands",
            },
            {
              to: "/rewards-calculator",
              label: "Rewards Calculator",
            },
            {
              to: "/stellar-coin-conversion",
              label: "Stellar Coin Conversion",
            },
            {
              to: "/stat-rolls",
              label: "Stat Rolls",
            },
            {
              to: "/marketplace",
              label: "Marketplace",
            },
          ],
        },
        {
          to: "/world-of-altharion",
          label: "The World of Altharion",
          position: "left",
          items: [
            {
              to: "/?view=world",
              label: "World Map",
            },
            {
              to: "/world-wiki",
              label: "World Wiki",
            },
            {
              to: "/world-timeline",
              label: "Timeline",
            },
          ],
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
