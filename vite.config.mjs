import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Two environments, told apart by the test file's extension: plain
    // logic runs in node, anything that renders React runs in a DOM.
    // `exclude` does not cascade from here into the projects, so the
    // Playwright suite has to be excluded where the files are matched.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "e2e/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.test.tsx"],
          environment: "happy-dom",
          // the goatcounter test injects the count script; happy-dom never
          // evaluates external scripts, and the default reports that as an
          // error log per appendChild — disabled loading is instead
          // reported as success, which also fires the script's "load"
          // event the analytics lib flushes queued counts on
          environmentOptions: {
            happyDOM: {
              settings: {
                disableJavaScriptFileLoading: true,
                handleDisabledFileLoadingAsSuccess: true,
              },
            },
          },
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
