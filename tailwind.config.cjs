/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.ts"],
  theme: {
    extend: {
      colors: {
        void: "#000000",
        glow: {
          warm: "#ff9e64",
          cool: "#7dcfff",
          merge: "#bb9af7",
          trace: "#9ece6a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
