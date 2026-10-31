import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: true,
    proxy: {
      "/api": process.env.VITE_API_PROXY || "http://127.0.0.1:8000",
      "/admin": process.env.VITE_API_PROXY || "http://127.0.0.1:8000",
      "/static": process.env.VITE_API_PROXY || "http://127.0.0.1:8000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          forms: ["zod", "react-hook-form", "@hookform/resolvers/zod"],
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    css: false,
  },
});
