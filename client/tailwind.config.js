/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
        display: ["Scribble Serif", "Montserrat", "serif"],
      },
      colors: {
        bunker: {
          950: "#000000",
          900: "#060606",
          800: "#101010",
          700: "#1a1a1a",
          600: "#333333",
        },
        gold: {
          light: "#f9d35b",
          DEFAULT: "#d96613",
          dark: "#b8560f",
        },
        silver: {
          light: "#c9c9c9",
          DEFAULT: "#bfbfbf",
          dark: "#888888",
          mid: "#6f6f6f",
        },
        info: {
          light: "#c8ebf8",
          DEFAULT: "#3bddf2",
          dark: "#365498",
        },
        danger: {
          light: "#ff3838",
          DEFAULT: "#b52626",
        },
        success: {
          DEFAULT: "#328925",
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(90deg, #f9d35b 0%, #d96613 100%)",
        "gold-gradient-v": "linear-gradient(180deg, #f9d35b 0%, #d96613 100%)",
        "silver-gradient":
          "linear-gradient(90deg, #bfbfbf 0%, #888888 53.646%, #c9c9c9 100%)",
        "info-gradient": "linear-gradient(90deg, #3bddf2 0%, #365498 100%)",
        "danger-gradient": "linear-gradient(90deg, #e33030 0%, #b52626 100%)",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "14px",
        xl: "16px",
      },
      boxShadow: {
        "glass-glow": "0 0 5px rgba(0, 0, 0, 0.6)",
      },
      backdropBlur: {
        card: "20px",
      },
    },
  },
  plugins: [],
};
