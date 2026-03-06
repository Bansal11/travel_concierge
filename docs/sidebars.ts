import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "Introduction",
    },
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: [
        "getting-started/installation",
        "getting-started/quick-start",
      ],
    },
    {
      type: "category",
      label: "Architecture",
      items: [
        "architecture/overview",
        "architecture/design-patterns",
      ],
    },
    {
      type: "category",
      label: "User Guide",
      items: [
        "user-guide/chat",
        "user-guide/admin",
      ],
    },
    {
      type: "category",
      label: "API Reference",
      items: [
        "api-reference/gateway",
        "api-reference/embedding-service",
      ],
    },
    {
      type: "category",
      label: "Deployment",
      items: [
        "deployment/docker",
        "deployment/environment-variables",
      ],
    },
  ],
};

export default sidebars;
