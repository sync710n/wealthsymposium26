import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = resolve(import.meta.dirname, "..");

export default defineConfig({
  resolve: {
    alias: [
      { find: "@tanstack/react-start", replacement: resolve(import.meta.dirname, "shims/server-fn.ts") },
      { find: "@", replacement: resolve(root, "src") },
    ],
  },
  publicDir: false,
  build: {
    ssr: true,
    outDir: resolve(root, "Desktop Local/supabase/functions/workshop"),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, "server-entry.ts"),
      output: {
        entryFileNames: "server.js",
        format: "es",
      },
    },
  },
  ssr: {
    noExternal: true,
    target: "neutral",
  },
});
