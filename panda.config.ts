// VESTIGIAL: This file is no longer used. Project now uses Tailwind CSS.
// Kept for reference only. Can be deleted once Tailwind migration is fully verified.

import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {
      tokens: {
        colors: {
          primary: { value: "#3b82f6" },
          secondary: { value: "#10b981" },
          danger: { value: "#ef4444" },
          warning: { value: "#f59e0b" },
          background: { value: "#0f172a" },
          surface: { value: "#1e293b" },
          text: { value: "#f1f5f9" },
          muted: { value: "#94a3b8" },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
