import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hypecutz Design System — Section 4
        background: {
          DEFAULT: "#0F0F0F",   // primary — near black
          card: "#1A1A1A",      // dark card surface
          elevated: "#2D2D2D",  // inputs, modals
        },
        accent: {
          DEFAULT: "#C9A84C",   // gold — CTAs, active states, highlights
        },
        text: {
          primary: "#F5F5F5",   // white
          secondary: "#888888", // muted labels
        },
        border: {
          DEFAULT: "#333333",   // subtle dividers
        },
        success: "#22C55E",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",    // cards
        button: "8px",   // buttons
        input: "6px",    // inputs
      },
    },
  },
  plugins: [],
};
export default config;
