import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0e1413",
        panel: "#151d1b",
        panelSoft: "#1b2522",
        line: "#27342f",
        gold: "#d2a64a",
        mint: "#7cc7ad",
        canvas: "var(--canvas)",
        header: "var(--header)",
        rail: "var(--rail)",
        tab: "var(--tab)",
        selected: "var(--selected)",
        hover: "var(--hover)",
        heading: "var(--heading)",
        body: "var(--body)",
        muted: "var(--muted)",
        green: "var(--green)",
        railIcon: "var(--rail-icon)",
      },
      fontFamily: {
        arabicKfgq: ["var(--font-arabic-kfgq)", "serif"],
        arabicAmiri: ["var(--font-arabic-amiri)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(210,166,74,0.14), 0 20px 80px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
