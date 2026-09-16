/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f0",
          100: "#d6ecdb",
          200: "#aed9b8",
          300: "#7fc191",
          400: "#4ea468",
          500: "#2f8a4c",
          600: "#1f6e3a",
          700: "#17552d",
          800: "#124324",
          900: "#0d331b",
        },
        gold: {
          400: "#e3c264",
          500: "#d4af37",
          600: "#b4912a",
        },
        navy: {
          700: "#16325c",
          800: "#0f2547",
          900: "#0a1a33",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 4px 16px rgba(16,24,40,.06)",
      },
    },
  },
  plugins: [],
};
