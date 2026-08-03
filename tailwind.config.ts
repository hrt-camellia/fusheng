import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FAF9FF",
          100: "#F1EEFF",
          200: "#E4DEFF",
          300: "#CDC2FF",
          400: "#B39FFD",
          500: "#9B8AFB",
          600: "#806DE8",
          700: "#6D5BD0",
          800: "#5848AD",
          900: "#493D8C"
        },
        ink: "#302E3A",
        muted: "#777285",
        gold: "#C9A85C"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(109, 91, 208, 0.12)"
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(circle at 75% 20%, rgba(205,194,255,.75), transparent 34%), radial-gradient(circle at 15% 70%, rgba(241,238,255,.95), transparent 38%)"
      }
    }
  },
  plugins: []
} satisfies Config;
