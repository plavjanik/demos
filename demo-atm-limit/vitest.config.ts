// Own config for this example's live-host tests (root vitest.config.ts
// excludes examples/** — these need a real TK5 container, not CI). The
// alias makes `@panelwright/core` resolve to the built package without this
// directory joining the npm workspace. The two test files must run one
// after the other: each opens its own session as HERC02, and a TSO user
// can be logged on only once.
import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { fileParallelism: false },
  resolve: {
    alias: {
      "@panelwright/core": path.resolve(import.meta.dirname, "../../packages/core/dist/index.js"),
    },
  },
});
