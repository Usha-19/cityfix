/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          600: "#334e68",
          700: "#243b53",
          800: "#102a43",
          900: "#0b1f33",
        },
        teal: {
          50: "#effcf6",
          100: "#c6f7e2",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
        slate: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Slightly larger small-end sizes so tables, badges and labels read well.
        xs: ["0.8125rem", { lineHeight: "1.1rem" }],
        sm: ["0.9375rem", { lineHeight: "1.4rem" }],
        base: ["1.0625rem", { lineHeight: "1.6rem" }],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        soft: "0 4px 16px -2px rgb(16 42 67 / 0.08)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
