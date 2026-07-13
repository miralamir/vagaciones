import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        mist: "#eef4f6",
        sea: "#1b7f83",
        coral: "#d9634f",
        olive: "#6d7d38"
      }
    }
  },
  plugins: []
};

export default config;
