import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        base: "#F2EFE9",
        ink: "#1A1A1A",
        accent: "#1455D9",
        status: {
          red: "#D92D20",
          amber: "#DC6803",
          green: "#15B79E",
        }
      },
      fontFamily: {
        display: ["var(--font-roboto)", "sans-serif"],
        body: ["var(--font-noto-sans)", "sans-serif"],
      }
    },
  },
  plugins: [],
};
export default config;
