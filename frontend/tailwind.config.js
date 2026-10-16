import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    join(__dirname, "index.html"),
    join(__dirname, "src/**/*.{ts,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "var(--color-brand-red)",
          "red-hover": "var(--color-brand-red-hover)",
          "red-tint": "var(--color-brand-red-tint)",
        },
        canvas: {
          ivory: "var(--color-canvas-ivory)",
          warm: "var(--color-canvas-warm)",
        },
        surface: {
          white: "var(--color-surface-white)",
          raised: "var(--color-surface-raised)",
          border: "var(--color-surface-border)",
        },
        ink: {
          charcoal: "var(--color-ink-charcoal)",
          secondary: "var(--color-ink-secondary)",
          muted: "var(--color-ink-muted)",
        },
      },
      borderRadius: {
        neo: "var(--radius-neo-card)",
        "neo-sm": "var(--radius-neo-button)",
        "neo-pill": "9999px",
      },
      boxShadow: {
        neo: "var(--shadow-neo-card)",
        "neo-sm": "var(--shadow-neo-button)",
        "neo-hover": "var(--shadow-neo-hover)",
        "neo-inset": "var(--shadow-neo-inset)",
      },
    },
  },
  plugins: [],
};
