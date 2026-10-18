/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#071931",
          900: "#0b2d57",
          800: "#13447c",
          100: "#e7f0ff"
        },
        positive: "#0c9f57"
      },
      boxShadow: {
        soft: "0 20px 55px -25px rgba(7, 25, 49, 0.35)"
      },
      animation: {
        "fade-up": "fadeUp 0.55s ease-out"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};
