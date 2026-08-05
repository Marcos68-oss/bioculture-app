import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Estados de stock — tonos desaturados, no saturados "AI-neon"
        ok: {
          DEFAULT: "#3f7a5e",
          bg: "#132019",
          border: "#234534",
          text: "#7fb89a",
        },
        warn: {
          DEFAULT: "#a8703a",
          bg: "#221a10",
          border: "#4a3620",
          text: "#d8a06a",
        },
        danger: {
          DEFAULT: "#8a3b4a",
          bg: "#210f13",
          border: "#4a222a",
          text: "#d4899a",
        },
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0,0,0,0.4)",
      },
      keyframes: {
        pulseOnce: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
        flashGood: {
          "0%": { backgroundColor: "rgba(63,122,94,0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashBad: {
          "0%": { backgroundColor: "rgba(138,59,74,0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        "pulse-once": "pulseOnce 180ms ease-out",
        "flash-good": "flashGood 500ms ease-out",
        "flash-bad": "flashBad 500ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
