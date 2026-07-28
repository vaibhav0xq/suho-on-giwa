import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "SFMono-Regular", "Consolas", "monospace"]
      },
      colors: {
        surface: "rgb(var(--surface) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        panel2: "rgb(var(--panel-2) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        action: "rgb(var(--action) / <alpha-value>)",
        safe: "rgb(var(--safe) / <alpha-value>)",
        caution: "rgb(var(--caution) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)"
      },
      boxShadow: {
        suho: "0 24px 80px rgb(0 0 0 / 0.22)",
        signal: "0 0 0 1px rgb(var(--action) / 0.22), 0 16px 60px rgb(var(--action) / 0.18)"
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateX(-120%)", opacity: "0" },
          "18%": { opacity: "1" },
          "100%": { transform: "translateX(120%)", opacity: "0" }
        },
        settle: {
          "0%": { transform: "scale(0.98)", opacity: "0.6" },
          "100%": { transform: "scale(1)", opacity: "1" }
        }
      },
      animation: {
        scan: "scan 1.2s cubic-bezier(.2,.8,.2,1) infinite",
        settle: "settle 220ms cubic-bezier(.2,.8,.2,1) both"
      }
    }
  },
  plugins: []
};

export default config;