import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          elevated: "var(--surface-elevated)",
          "container-lowest": "var(--surface-container-lowest)",
          "container-low": "var(--surface-container-low)",
          container: "var(--surface-container)",
          "container-highest": "var(--surface-container-highest)",
          dim: "var(--surface-dim)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
          strong: "var(--border-strong)",
        },
        outline: {
          DEFAULT: "var(--outline)",
          variant: "var(--outline-variant)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
          soft: "var(--primary-soft)",
          container: "var(--primary-container)",
          fixed: "var(--primary-fixed)",
          "fixed-dim": "var(--primary-fixed-dim)",
        },
        // Stitch on-* tokens. on-surface / on-surface-variant are documented
        // aliases of the shared neutral text tokens (T003 labels match).
        "on-primary": "var(--on-primary)",
        "on-primary-container": "var(--on-primary-container)",
        "on-surface": "var(--text-primary)",
        "on-surface-variant": "var(--text-secondary)",
        ai: {
          DEFAULT: "var(--ai)",
          hover: "var(--ai-hover)",
          soft: "var(--ai-soft)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
          container: "var(--success-container)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
          container: "var(--danger-container)",
        },
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
          container: "var(--info-container)",
        },
        "on-danger-container": "var(--on-danger-container)",
        "on-info-container": "var(--on-info-container)",
        code: {
          background: "var(--code-background)",
          surface: "var(--code-surface)",
          text: "var(--code-text)",
          muted: "var(--code-muted)",
        },
        "focus-ring": "var(--focus-ring)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
