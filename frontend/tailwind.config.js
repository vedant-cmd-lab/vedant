/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        body: ["'Outfit'", "sans-serif"],
        data: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        sd: {
          base: "#0E0D0F",
          surface: "#1A1719",
          elevated: "#241F22",
          hairline: "#3A3238",
          gold: "#F2A93B",
          glow: "#FFD07A",
          copper: "#C4634A",
          teal: "#3E9E93",
          text: "#F7F1E6",
          muted: "#9A9188",
        },
        border: "#3A3238",
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem'
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
};
