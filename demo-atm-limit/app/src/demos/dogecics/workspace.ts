/**
 * Maps generated CODE keys to the workspace-relative path VS Code would
 * show for them, and lists the Explorer tree exactly as the real
 * demo-atm-limit workspace is laid out (read-only inputs the demo
 * replays, never modifies). Pruned to what the story actually opens —
 * captures/, app/ and scripts/ are the demo's OWN build machinery, not part
 * of the workspace a developer working this ticket would see. Every key
 * here that names a `codeKey` must also exist in `scripts/prerender.mts`'s
 * `CODE_FILES` — that script's own header cross-references back here.
 */
import type { TreeNode } from "../../kit/engine/content";

export const CODE_PATH: Record<string, string> = {
  "DOGESEND.cbl": "cobol/DOGESEND.cbl",
  // Tab label is the real workspace path a developer would see — the "v0"
  // in the CODE key is this demo's own bookkeeping (which captured revision
  // to render), not a file that exists on disk. The diff steps label their
  // OWN tabs from `diffOf`'s key basenames instead (Editor.tsx), so this
  // doesn't touch those.
  "DOGESEND.v0.cbl": "cobol/DOGESEND.cbl",
  "DOGESEND.v1.cbl": "captures/run1/DOGESEND.v1.cbl",
  "DOGESEND.v2.cbl": "captures/run1/DOGESEND.v2.cbl",
  "DOGESEND.v1.diff": "captures/run1/DOGESEND.v1.diff",
  "DOGESEND.v2.diff": "captures/run1/DOGESEND.v2.diff",
  "DOGEMAIN.cbl": "cobol/DOGEMAIN.cbl",
  "COMPSEND.jcl": "jcl/COMPSEND.jcl",
  "COMPCOBL.jcl": "jcl/COMPCOBL.jcl",
  "atm.ts": "atm/atm.ts",
  "atm.regression.test.ts": "test/atm.regression.test.ts",
  "atm.limit.test.ts": "test/atm.limit.test.ts",
  "AGENTS.md": "AGENTS.md",
};

export const EXPLORER_TREE: TreeNode[] = [
  {
    name: "atm",
    path: "atm",
    kind: "dir",
    children: [
      { name: "atm.ts", path: "atm/atm.ts", kind: "file", codeKey: "atm.ts" },
      { name: "cli.ts", path: "atm/cli.ts", kind: "file" },
      { name: "screen.ts", path: "atm/screen.ts", kind: "file" },
    ],
  },
  {
    name: "bms",
    path: "bms",
    kind: "dir",
    children: [{ name: "DOGESMAP.bms", path: "bms/DOGESMAP.bms", kind: "file" }],
  },
  {
    name: "cobol",
    path: "cobol",
    kind: "dir",
    children: [
      { name: "DOGEMAIN.cbl", path: "cobol/DOGEMAIN.cbl", kind: "file", codeKey: "DOGEMAIN.cbl" },
      { name: "DOGESEND.cbl", path: "cobol/DOGESEND.cbl", kind: "file", codeKey: "DOGESEND.cbl" },
    ],
  },
  {
    name: "jcl",
    path: "jcl",
    kind: "dir",
    children: [
      { name: "COMPCOBL.jcl", path: "jcl/COMPCOBL.jcl", kind: "file", codeKey: "COMPCOBL.jcl" },
      { name: "COMPSEND.jcl", path: "jcl/COMPSEND.jcl", kind: "file", codeKey: "COMPSEND.jcl" },
      { name: "RESEED.jcl", path: "jcl/RESEED.jcl", kind: "file" },
    ],
  },
  {
    name: "test",
    path: "test",
    kind: "dir",
    children: [
      {
        name: "atm.regression.test.ts",
        path: "test/atm.regression.test.ts",
        kind: "file",
        codeKey: "atm.regression.test.ts",
      },
      { name: "atm.limit.test.ts", path: "test/atm.limit.test.ts", kind: "file", codeKey: "atm.limit.test.ts" },
    ],
  },
  { name: "AGENTS.md", path: "AGENTS.md", kind: "file", codeKey: "AGENTS.md" },
  { name: "CLAUDE.md", path: "CLAUDE.md", kind: "file" },
  { name: "README.md", path: "README.md", kind: "file" },
  { name: "tsconfig.json", path: "tsconfig.json", kind: "file" },
  { name: "vitest.config.ts", path: "vitest.config.ts", kind: "file" },
];
