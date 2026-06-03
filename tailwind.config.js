export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "IBM Plex Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      colors: {
        deck: "#050505",
        bone: "#f5f2e8",
        volt: "#ff4d00",
        ghost: "#9ca3af",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        rain: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "12%": { opacity: "1" },
          "100%": { transform: "translateY(110%)", opacity: "0" },
        },
      },
      animation: {
        scan: "scan 1.6s linear infinite",
        rain: "rain 2.8s linear infinite",
      },
    },
  },
  plugins: [],
};
