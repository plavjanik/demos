/**
 * Vite config for the demo presentation app. Static build only — no server
 * runtime, everything is pre-rendered at build time by scripts/prerender.mts.
 * Five HTML entries: index.html (the landing page listing the demos),
 * dogecics.html (DOGECICS, the original story), techutex.html (the Techutex
 * Banking / Endevor story), techutex-variants.html (the same story behind
 * a Full/Medium/Short chooser) and bench.html (the ATM skin decision bench) —
 * all need listing explicitly or `vite build` only emits the one Vite finds
 * by default (index.html).
 */
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Baked into import.meta.env.VITE_BUILD (see src/vite-env.d.ts for its type,
// src/story/reviewData.ts for its one consumer — the review-mode Markdown
// export's header, so Petr knows which build his notes refer to). Falls
// back to "dev" outside a git checkout (a from-tarball build, CI without
// history) rather than failing the build over a cosmetic label.
function buildId(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: import.meta.dirname })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

export default defineConfig({
  plugins: [react()],
  base: "./",
  define: {
    "import.meta.env.VITE_BUILD": JSON.stringify(buildId()),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        dogecics: path.resolve(import.meta.dirname, "dogecics.html"),
        techutex: path.resolve(import.meta.dirname, "techutex.html"),
        techutexVariants: path.resolve(import.meta.dirname, "techutex-variants.html"),
        bench: path.resolve(import.meta.dirname, "bench.html"),
      },
    },
  },
  server: {
    fs: {
      // The Techutex demo's brand logo (demo-techutex-limit/brand/
      // *.png) lives OUTSIDE this app's own root, as a sibling example dir —
      // Vite's dev server refuses to serve a file outside root by default.
      // Widened to the whole examples/ dir (this app's grandparent) so any
      // future sibling demo's own assets work the same way without another
      // config edit.
      allow: [path.resolve(import.meta.dirname, "../..")],
    },
  },
});
