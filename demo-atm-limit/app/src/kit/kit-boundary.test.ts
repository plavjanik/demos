/**
 * Pins the whole point of the kit/demo split: src/kit/** may import React,
 * third-party libraries, and other src/kit/** files — nothing that reaches
 * into any one demo (src/demos/<name>/**, e.g. src/demos/dogecics/**,
 * src/demos/techutex/**) or the generated build artefacts
 * (src/generated/<name>/**). Walks every .ts/.tsx file under src/kit with `fs`
 * (no bundler resolution) and greps its import/export specifiers, so a
 * violation fails here even if it happens to typecheck (a relative import
 * that only LOOKS like it stays inside kit/, e.g. "../../demo/steps").
 */
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";

const KIT_ROOT = path.resolve(import.meta.dirname);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

// Import/export specifiers only — an ES `from` clause or a bare side-
// effect import — not every quoted string in the file (a CSS class name,
// a chat transcript literal, etc). Phrased without a literal example of
// the shape it matches, so this comment doesn't match its own regex.
const SPECIFIER_RE = /\b(?:from|import)\s+["']([^"']+)["']/g;

// A specifier is a boundary violation if, resolved relative to the
// importing file's own directory, it leaves src/kit — a plain substring
// check on "../demo" would miss "../../demo" from a deeper file and false-
// positive on an unrelated path that merely contains "demo" as a
// substring, so this resolves the path instead of pattern-matching it.
function leavesKit(fromFile: string, specifier: string): boolean {
  if (!specifier.startsWith(".")) return false; // a package import, not a relative path
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  const rel = path.relative(KIT_ROOT, resolved);
  return rel.startsWith("..");
}

describe("kit/demo boundary", () => {
  test("no file under src/kit imports outside src/kit", () => {
    const violations: string[] = [];
    for (const file of walk(KIT_ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(SPECIFIER_RE)) {
        const specifier = m[1]!;
        if (leavesKit(file, specifier)) {
          violations.push(`${path.relative(KIT_ROOT, file)}: imports "${specifier}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("no old pre-split path survives (regression: story/, chrome/, scenes/, components/, lib/svg, singular demo/generated)", () => {
    const violations: string[] = [];
    const oldPaths = [
      /\bstory\//,
      /\bchrome\//,
      /\bscenes\//,
      /\bcomponents\//,
      /\blib\/svg/,
      // Pre-multi-demo-split singular dirs (src/demo/, src/generated/code|
      // captures) — the current layout is src/demos/<name>/ and
      // src/generated/<name>/; a kit file was never allowed to import
      // either shape (test above already catches that generically), but
      // these two patterns guard the EXACT regression the split could
      // reintroduce by accident.
      /\.\.\/demo\//,
      /\.\.\/generated\/(code|captures)$/,
    ];
    for (const file of walk(KIT_ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(SPECIFIER_RE)) {
        const specifier = m[1]!;
        if (oldPaths.some((re) => re.test(specifier))) {
          violations.push(`${path.relative(KIT_ROOT, file)}: imports "${specifier}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
