/**
 * This repository is public. A capture must not carry the identifiers of
 * the system it was recorded on, nor an agent session transcript. The
 * checks are PATTERNS on purpose: naming a real value here would publish it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCANNED_DIRS = ["demo-atm-limit", "demo-techutex-limit", "docs"];
const SKIPPED_DIRS = new Set(["node_modules", "dist", ".git"]);
const TEXT_FILE = /\.(md|txt|json|jsonl|ts|tsx|mts|js|cbl|cob|jcl|bms|svg|html|css|diff|outlist|yml)$/i;
const THIS_FILE = path.resolve(__dirname, "publicCopy.test.ts");

const FORBIDDEN: Array<[what: string, pattern: RegExp]> = [
  ["a lab host name", /\b[a-z0-9-]+\.[a-z0-9-]+\.labs\.[a-z0-9-]+\.(net|com)\b/i],
  ["a lab z/OS userid or a job/dataset name built on one", /\bPROD\d{3,4}\b/i],
  ["a real CICS region name", /\bCICSZ\d{3}\b/],
  ["an agent session transcript record", /"type":\s*"(nested_memory|prompt_snapshot)"/],
  ["a personal home directory", /\/Users\/(?!dev\b)[a-z][a-z0-9._-]+\//],
];

function* textFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* textFiles(full);
    else if (TEXT_FILE.test(name) && full !== THIS_FILE) yield full;
  }
}

describe("the public copy carries no lab identifiers", () => {
  const files = SCANNED_DIRS.flatMap((d) => [...textFiles(path.join(REPO_ROOT, d))]);

  it("finds files to scan", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const [what, pattern] of FORBIDDEN) {
    it(`has no ${what}`, () => {
      const hits = files.filter((f) => pattern.test(readFileSync(f, "utf8"))).map((f) => path.relative(REPO_ROOT, f));
      expect(hits).toEqual([]);
    });
  }
});
