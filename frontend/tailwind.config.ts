import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          950: "#0c1a2e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
