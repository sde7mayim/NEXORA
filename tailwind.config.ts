import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      fontSize: {
        "display-hero": ["clamp(2.25rem, 5vw, 3rem)", { lineHeight: "1.15", letterSpacing: "-0.03em" }],
        "heading-1": ["clamp(1.875rem, 4vw, 2.375rem)", { lineHeight: "1.2", letterSpacing: "-0.025em" }],
        "heading-2": ["1.625rem", { lineHeight: "1.3", letterSpacing: "-0.02em" }], // 26px
        "heading-3": ["1.375rem", { lineHeight: "1.35", letterSpacing: "-0.01em" }], // 22px
        "chat-body": ["1.09375rem", { lineHeight: "1.68" }], // 17.5px
        "body-lg": ["1.125rem", { lineHeight: "1.6" }], // 18px
        "body-md": ["1.0625rem", { lineHeight: "1.6" }], // 17px
        "body-standard": ["1rem", { lineHeight: "1.55" }], // 16px
        "ui-nav": ["0.96875rem", { lineHeight: "1.4" }], // 15.5px
        "ui-input": ["1.03125rem", { lineHeight: "1.45" }], // 16.5px
        "ui-caption": ["0.90625rem", { lineHeight: "1.45" }], // 14.5px
        "ui-meta": ["0.84375rem", { lineHeight: "1.4" }], // 13.5px
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
      },
      animation: {
        shimmer: "shimmer 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 5s ease-in-out infinite",
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
