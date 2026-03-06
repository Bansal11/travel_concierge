import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Travel Concierge",
  tagline: "AI-powered RAG platform for holiday packages",
  favicon: "img/favicon.ico",

  url: "https://docs.travel-concierge.dev",
  baseUrl: "/",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

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
          routeBasePath: "/",
          editUrl: "https://github.com/Bansal11/travel_concierge/edit/main/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "light",
      respectPrefersColorScheme: true,
    },

    navbar: {
      title: "Travel Concierge",
      logo: {
        alt: "Travel Concierge Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "http://localhost:8000/docs",
          label: "API Explorer",
          position: "left",
        },
        {
          href: "https://github.com/Bansal11/travel_concierge",
          label: "GitHub",
          position: "right",
        },
      ],
    },

    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Getting Started", to: "/getting-started/installation" },
            { label: "Architecture", to: "/architecture/overview" },
            { label: "API Reference", to: "/api-reference/gateway" },
          ],
        },
        {
          title: "API",
          items: [
            { label: "Gateway API Explorer", href: "http://localhost:8000/docs" },
            { label: "Embedding Service Swagger", href: "http://localhost:8001/docs" },
            { label: "OpenAPI Spec (YAML)", href: "/openapi/gateway.yaml" },
          ],
        },
        {
          title: "More",
          items: [
            { label: "GitHub", href: "https://github.com/Bansal11/travel_concierge" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Travel Concierge. Built with Docusaurus.`,
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "python", "typescript", "yaml", "json", "sql"],
    },

    algolia: undefined,
  } satisfies Preset.ThemeConfig,
};

export default config;
