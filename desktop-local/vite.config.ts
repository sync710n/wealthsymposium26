import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = resolve(import.meta.dirname, "..");

function classicFileScript() {
  return {
    name: "classic-file-script",
    apply: "build" as const,
    transformIndexHtml(html: string) {
      const plain = html.replaceAll(' type="module"', "").replaceAll(" crossorigin", "");
      return plain
        .replace(/\s*<script src="\.\/workshop\.js"><\/script>/, "")
        .replace("</body>", '  <script src="./workshop.js"></script>\n  </body>');
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  base: "./",
  plugins: [react(), tailwindcss(), classicFileScript()],
  resolve: {
    alias: [
      { find: "@/lib/ai.functions", replacement: resolve(import.meta.dirname, "browser-ai.ts") },
      { find: "@tanstack/react-start", replacement: resolve(import.meta.dirname, "shims/tanstack-start.ts") },
      { find: "@", replacement: resolve(root, "src") },
    ],
  },
  build: {
    outDir: resolve(root, "Desktop Local"),
    emptyOutDir: false,
    minify: false,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: {
      output: {
        format: "iife",
        codeSplitting: false,
        entryFileNames: "workshop.js",
        assetFileNames: "workshop.css",
      },
    },
  },
});
