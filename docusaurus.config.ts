import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Reaches of Altharion",
  tagline: "D&D 5.5e Westmarch Server",
  favicon: "img/altharion_logo_white.ico",
  customFields: {
    authApiBaseUrl: process.env.CLIENT_AUTH_API_BASE_URL || "",
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
          sidebarPath: "./sidebars.ts",
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
                  context: ["/auth", "/api", "/health"],
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
    colorMode: {
      defaultMode: "dark",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: "Reaches of Altharion",
      logo: {
        alt: "Reaches of Altharion Logo",
        src: "img/altharion_logo_white.png",
        href: "/?view=map",
      },
      items: [
        { to: "/?view=map", label: "Home", position: "left" },
        {
          label: "Player Information",
          position: "left",
          items: [
            {
              to: "/docs/getting-set-up",
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
              to: "/character-attributes",
              label: "Server Stats",
            },
          ],
        },
        {
          to: "/docs/dm-rules",
          label: "DM Rules",
          position: "left",
        },
        {
          to: "/docs/rp-rules",
          label: "RP Rules",
          position: "left",
        },
        {
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
          label: "Calculators",
          position: "left",
          items: [
            {
              to: "/rewards-calculator",
              label: "Rewards Calculator",
            },
            {
              to: "/stellar-coin-conversion",
              label: "Stellar Coin Conversion",
            },
          ],
        },
        {
          to: "/?view=world",
          label: "The World of Altharion",
          position: "left",
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
