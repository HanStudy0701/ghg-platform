import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Noto Sans TC", "sans-serif"],
        serif: ["Noto Serif TC", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        brand: {
          red: "#C8102E",
          green: {
            DEFAULT: "#1B4332",
            medium: "#40916C",
            light: "#74C69D",
          },
        },
        background: "#F8F7F4",
        border: "#E0E0DC",
        foreground: "#1A1A1A",
        muted: "#6B7280",
      },
      borderRadius: {
        lg: "4px",
        md: "4px",
        sm: "4px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
