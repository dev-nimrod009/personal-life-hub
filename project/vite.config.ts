import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    sourcemap: false,
    minify: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          pglite: ["@electric-sql/pglite"],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Life Hub",
        short_name: "Life Hub",
        description: "Your private journal, planner, and wellbeing hub",
        theme_color: "#3d7f5b",
        background_color: "#fbf9f4",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,webmanifest,wasm}"],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        navigateFallback: "/index.html",
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
});
