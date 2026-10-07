import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#f2f9f4",
          100: "#e1f3e7",
          200: "#c4e6cf",
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
          800: "#14532d",
          900: "#144225",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        agro: {
          primary: "var(--agro-green-900)",
          growth: "var(--agro-growth)",
          clay: "var(--agro-clay)",
          amber: "var(--agro-amber)",
          cream: "var(--agro-cream)",
          white: "var(--agro-white)",
          charcoal: "var(--agro-charcoal)",
          surface: "var(--agro-surface-muted)",
          border: "var(--agro-border)",
          "border-subtle": "var(--agro-border-subtle)",
          green: {
            50: "var(--agro-green-50)",
            100: "var(--agro-green-100)",
            200: "var(--agro-green-200)",
            300: "var(--agro-green-300)",
            400: "var(--agro-green-400)",
            500: "var(--agro-green-500)",
            600: "var(--agro-green-600)",
            700: "var(--agro-green-700)",
            800: "var(--agro-green-800)",
            900: "var(--agro-green-900)",
            950: "var(--agro-green-950)",
          },
          // Legacy mappings preserved for compatibility
          earth: "#78350f",
          gold: "#d97706",
          leaf: "#15803d",
          soil: "#292524",
        },
        success: {
          DEFAULT: "var(--agro-success)",
          bg: "var(--agro-success-bg)",
          border: "var(--agro-success-border)",
        },
        warning: {
          DEFAULT: "var(--agro-warning)",
          bg: "var(--agro-warning-bg)",
          border: "var(--agro-warning-border)",
        },
        danger: {
          DEFAULT: "var(--agro-danger)",
          bg: "var(--agro-danger-bg)",
          border: "var(--agro-danger-border)",
        },
        info: {
          DEFAULT: "var(--agro-info)",
          bg: "var(--agro-info-bg)",
          border: "var(--agro-info-border)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
