import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07101d",
        panel: "#101c2d",
        line: "rgba(255,255,255,0.075)",
        brand: "#69a7ff",
        mint: "#4bd2a0",
        danger: "#ff6f7d",
        amber: "#ffbd69",
      },
      borderRadius: { xl2: "20px" },
    },
  },
  plugins: [],
};
export default config;
