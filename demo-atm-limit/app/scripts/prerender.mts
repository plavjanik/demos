/**
 * Build-time pre-rendering for EVERY demo this app bundles: turns each
 * demo's real source files and captured run artefacts into two generated
 * modules it imports at runtime with zero highlighting cost —
 * src/generated/<demo>/code.ts (shiki-highlighted HTML, a shared grammar/
 * theme setup both demos use) and src/generated/<demo>/captures.ts (raw
 * text, parsed timings, and inlined SVG screen captures — each demo's OWN
 * shape, since DOGECICS and Techutex captured different things). Run via
 * `npm run prerender`; `npm run build` and `npm run dev` both call it
 * first. Add a THIRD demo by adding one more entry to `DEMOS` below and,
 * if it needs a capture kind neither existing demo has, one more `read*`
 * helper alongside `read`/`readSvgDir` — the shiki/theme/grammar setup and
 * the CODE_FILES -> code.ts pipeline are already shared and need no
 * per-demo edit.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createHighlighter } from "shiki";
import type { LanguageRegistration, ShikiTransformer, ThemeRegistrationRaw } from "shiki";
import {
  inferDiffLangFromHeader,
  isContentRow,
  parseUnifiedDiff,
  type DiffContentLine,
  type DiffRow,
  type ParsedDiff,
} from "../src/kit/vscode/diffParse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");
const DOGECICS_EX_ROOT = path.resolve(APP_ROOT, "..");
const EXAMPLES_ROOT = path.resolve(DOGECICS_EX_ROOT, "..");
const TECHUTEX_EX_ROOT = path.join(EXAMPLES_ROOT, "demo-techutex-limit");
const GEN_ROOT = path.join(APP_ROOT, "src/generated");

// ---- JSONC (VS Code theme files carry comments + trailing commas) --------

function stripJsonc(text: string): string {
  let out = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    const next = text[i + 1];
    if (inLineComment) {
      if (c === "\n") {
        inLineComment = false;
        out += c;
      }
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i++;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    out += c;
  }
  // trailing commas before ] or }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

function readJsonc(absPath: string): Record<string, unknown> {
  return JSON.parse(stripJsonc(readFileSync(absPath, "utf8"))) as Record<string, unknown>;
}

// ---- Theme: merge dark_vs (base) <- dark_plus <- dark_modern --------------
// Shared by both demos — one VS Code Dark Modern theme, not one per demo.

const THEME_SRC = path.join(APP_ROOT, "scripts/themes-src");
const vs = readJsonc(path.join(THEME_SRC, "dark_vs.json"));
const plus = readJsonc(path.join(THEME_SRC, "dark_plus.json"));
const modern = readJsonc(path.join(THEME_SRC, "dark_modern.json"));

const THEME_NAME = "dogecics-dark-modern";
const mergedTheme: ThemeRegistrationRaw = {
  name: THEME_NAME,
  type: "dark",
  colors: {
    ...((vs["colors"] as Record<string, string>) ?? {}),
    ...((plus["colors"] as Record<string, string>) ?? {}),
    ...((modern["colors"] as Record<string, string>) ?? {}),
  },
  // Later files' rules win: concatenate base -> overlay -> overlay, matching
  // the "include" chain dark_modern -> dark_plus -> dark_vs the real VS Code
  // theme files declare (we don't rely on shiki resolving `include` itself).
  tokenColors: [
    ...((vs["tokenColors"] as unknown[]) ?? []),
    ...((plus["tokenColors"] as unknown[]) ?? []),
    ...((modern["tokenColors"] as unknown[]) ?? []),
  ],
} as ThemeRegistrationRaw;

// ---- Grammars: custom COBOL/JCL/BMS, normalized to short lang ids --------

const GRAMMARS_DIR = path.join(APP_ROOT, "grammars");
function loadGrammar(file: string, id: string): LanguageRegistration {
  const g = JSON.parse(readFileSync(path.join(GRAMMARS_DIR, file), "utf8")) as LanguageRegistration;
  // The grammars' own `name` fields ("COBOL", "Job Control Language", "bms")
  // are not stable shiki lang ids (spaces, mixed case) — pin our own.
  return { ...g, name: id };
}
const cobolGrammar = loadGrammar("COBOL.spgennard.tmLanguage.json", "cobol");
const jclGrammar = loadGrammar("jcl.dkelosky.tmLanguage.json", "jcl");
const bmsGrammar = loadGrammar("bms.tmLanguage.json", "bms");

const highlighter = await createHighlighter({
  themes: [mergedTheme],
  // "markdown"/"javascript" are shiki's own bundled grammars — no custom
  // grammar file needed, unlike COBOL/JCL/BMS.
  // "diff" itself is still registered even though renderDiffEntry (below)
  // never highlights WITH it any more — the raw text still declares lang
  // "diff" in CODE_FILES, kept as a defensive no-op in case anything ever
  // calls the highlighter with it directly. "text" is shiki's built-in
  // no-grammar passthrough, for renderDiffEntry's else-plain fallback.
  langs: ["typescript", "javascript", "diff", "bash", "markdown", "text", cobolGrammar, jclGrammar, bmsGrammar],
});

// ---- Shiki transformers: line-number gutter + diff +/- backgrounds -------
// Shared: both demos' code.ts go through the exact same two transformers.

function lineNumbers(): ShikiTransformer {
  return {
    name: "demo-line-numbers",
    line(node, line) {
      // structure: "classic" already wraps each line in <span class="line">.
      // data-line lets the Editor scroll to / highlight a specific source
      // line (Step.vscode.scrollToLine/highlightLines/diagnostics) without
      // re-parsing this static HTML at runtime.
      node.properties["data-line"] = String(line);
      node.children.unshift({
        type: "element",
        tagName: "span",
        properties: { class: "ln" },
        children: [{ type: "text", value: String(line) }],
      });
    },
  };
}

/** One `<span class="{cls}">{text}</span>` gutter cell — the building block for a diff row's old/new line-number columns and its +/- indicator. */
function gutterSpan(cls: string, text: string) {
  return {
    type: "element" as const,
    tagName: "span" as const,
    properties: { class: cls },
    children: [{ type: "text" as const, value: text }],
  };
}

/**
 * VS Code's own inline diff-editor look, in place of a raw unified patch
 * with +/- prefixes kept inside the code text (owner: "Is this the way
 * how VS Code visualizes the diffs?" — it wasn't). Renders each content
 * row (diffParse.ts's DiffRow, minus separators — those were highlighted
 * as one joined "document" so tokens stay coloured like a normal editor)
 * with two line-number gutters (old, new — blank on the side a line
 * doesn't exist on) plus a narrow +/- indicator column ahead of the code
 * text itself, and turns each hunk boundary into VS Code's own collapsed-
 * region bar: a full-width muted row with "⋯" in the gutter and no text,
 * never the raw "@@ -a,b +c,d @@" header.
 *
 * `line()` fires once per rendered line (in `contentRows` order, 1:1 with
 * the joined document); `code()` fires once afterwards with every line
 * already built (see @shikijs/core's codeToHast: line hooks run inside the
 * per-line loop, code() only after it — https://github.com/shikijs/shiki
 * core/src/highlight.ts) — which is what lets this reassemble the flat
 * line list into `allRows`' own order, splicing a separator row in wherever
 * diffParse.ts recorded one.
 */
function diffInlineRows(allRows: DiffRow[], contentRows: DiffContentLine[]): ShikiTransformer {
  return {
    name: "demo-diff-inline-rows",
    pre(node) {
      const existing = node.properties["class"] as string | undefined;
      node.properties["class"] = existing ? `${existing} shiki-diff` : "shiki-diff";
    },
    line(node, line) {
      const row = contentRows[line - 1];
      if (!row) return;
      // Scroll/highlight targeting (Editor.tsx's scrollToLine/highlightLines/
      // diagnostics) addresses a diff by its NEW-file line number, falling
      // back to the old one for a pure deletion — no diffOf step uses these
      // today (checked against both demos' steps.ts), but the attribute
      // stays generic rather than silently dropped.
      node.properties["data-line"] = String(row.newNo ?? row.oldNo ?? "");
      const cls = row.kind === "add" ? "diff-add" : row.kind === "del" ? "diff-del" : "";
      if (cls) {
        const existing = node.properties["class"] as string | undefined;
        node.properties["class"] = existing ? `${existing} ${cls}` : cls;
      }
      node.children.unshift(
        gutterSpan("diff-ln diff-ln-old", row.oldNo != null ? String(row.oldNo) : ""),
        gutterSpan("diff-ln diff-ln-new", row.newNo != null ? String(row.newNo) : ""),
        gutterSpan("diff-ind", row.kind === "add" ? "+" : row.kind === "del" ? "-" : ""),
      );
    },
    code(node) {
      const lineEls = node.children.filter((c): c is Extract<typeof c, { type: "element" }> => c.type === "element");
      const rebuilt: typeof node.children = [];
      let ci = 0;
      for (const row of allRows) {
        if (rebuilt.length > 0) rebuilt.push({ type: "text", value: "\n" });
        if (row.kind === "sep") {
          rebuilt.push({
            type: "element",
            tagName: "span",
            properties: { class: "line diff-sep" },
            children: [gutterSpan("diff-sep-glyph", "⋯")],
          });
        } else {
          rebuilt.push(lineEls[ci]!);
          ci++;
        }
      }
      node.children = rebuilt;
      return node;
    },
  };
}

/**
 * `.cbl`/`.cob`/`.cobol` on the diff's own `+++`/`---` header -> "cobol".
 * When the header carries no extension at all (Techutex's captured DOT500
 * diffs — their Endevor-side paths never had one, see MANIFEST.md), falls
 * back to the lang of a sibling CODE_FILES entry sharing the diff key's
 * base name (e.g. "DOT500.v1.diff" -> whatever "DOT500.v0.cbl" declares)
 * rather than going straight to plain text — every diff this app has ever
 * captured is a change to a file this app highlights elsewhere too, so
 * that sibling's declared language is real evidence, not a guess. Only a
 * diff key that matches neither falls through to shiki's plain "text".
 */
function inferDiffCodeLang(
  key: string,
  parsed: Pick<ParsedDiff, "oldFile" | "newFile">,
  files: CodeFileSpec[],
): string {
  const fromHeader = inferDiffLangFromHeader(parsed, "cobol", "");
  if (fromHeader) return fromHeader;
  const stem = /^(.*)\.v\d+\.diff$/.exec(key)?.[1];
  const sibling = stem && files.find(([k, , l]) => l !== "diff" && k.startsWith(`${stem}.`));
  return sibling ? sibling[2] : "text";
}

/** Parses + syntax-highlights one captured unified diff into the VS Code inline-diff-editor HTML diffInlineRows() builds — see both their own headers for the full picture. */
function renderDiffEntry(key: string, diffText: string, files: CodeFileSpec[]): CodeEntry {
  const parsed = parseUnifiedDiff(diffText);
  const contentRows = parsed.rows.filter(isContentRow);
  const codeLang = inferDiffCodeLang(key, parsed, files);
  const document = contentRows.map((r) => r.text).join("\n");
  const html = highlighter.codeToHtml(document, {
    lang: codeLang,
    theme: THEME_NAME,
    structure: "classic",
    transformers: [diffInlineRows(parsed.rows, contentRows)],
  });
  return { lang: "diff", html, lines: diffText.split("\n").length };
}

interface CodeEntry {
  lang: string;
  html: string;
  lines: number;
}

/** relToEx -> [key, path, lang]: one demo's CODE_FILES list. Shared renderer — same shiki call, same transformer choice by lang, for every demo. */
type CodeFileSpec = [key: string, relPath: string, lang: string];

function renderCodeFiles(exRoot: string, files: CodeFileSpec[]): Record<string, CodeEntry> {
  const out: Record<string, CodeEntry> = {};
  for (const [key, relPath, lang] of files) {
    const src = readFileSync(path.join(exRoot, relPath), "utf8");
    if (lang === "diff") {
      out[key] = renderDiffEntry(key, src, files);
      continue;
    }
    const html = highlighter.codeToHtml(src, {
      lang,
      theme: THEME_NAME,
      structure: "classic",
      transformers: [lineNumbers()],
    });
    out[key] = { lang, html, lines: src.split("\n").length };
  }
  return out;
}

function writeCodeModule(genDir: string, code: Record<string, CodeEntry>): void {
  mkdirSync(genDir, { recursive: true });
  writeFileSync(
    path.join(genDir, "code.ts"),
    `/**\n` +
      ` * GENERATED by scripts/prerender.mts — do not edit by hand.\n` +
      ` * Shiki-highlighted (VS Code Dark Modern) HTML for every source file this\n` +
      ` * demo's story steps through, keyed by filename.\n` +
      ` */\n` +
      `export interface CodeEntry {\n  lang: string;\n  html: string;\n  lines: number;\n}\n\n` +
      `export const CODE: Record<string, CodeEntry> = ${JSON.stringify(code, null, 2)};\n`,
  );
}

// ---- shared capture-reading primitives ------------------------------------

function makeRead(exRoot: string): (relToEx: string) => string {
  return (relToEx: string) => readFileSync(path.join(exRoot, relToEx), "utf8");
}

interface TimingRow {
  stage: string;
  t: string;
  epochMs: number;
  note: string;
}

function parseTimings(text: string): TimingRow[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as TimingRow);
}

function readSvgDir(exRoot: string, relDir: string): Record<string, string> {
  const abs = path.join(exRoot, relDir);
  const out: Record<string, string> = {};
  for (const f of readdirSync(abs)) {
    if (!f.endsWith(".svg")) continue;
    const key = `${path.basename(relDir)}/${f.replace(/\.svg$/, "")}`;
    out[key] = readFileSync(path.join(abs, f), "utf8");
  }
  return out;
}

function writeCapturesModule(genDir: string, headerTypesText: string, captures: unknown): void {
  mkdirSync(genDir, { recursive: true });
  writeFileSync(
    path.join(genDir, "captures.ts"),
    `/**\n * GENERATED by scripts/prerender.mts — do not edit by hand.\n */\n` +
      headerTypesText +
      `\nexport const CAPTURES = ${JSON.stringify(captures, null, 2)} as const;\n`,
  );
}

// ============================================================================
// DOGECICS — captures/run1 (unchanged shape from before the multi-demo split)
// ============================================================================

const DOGECICS_CODE_FILES: CodeFileSpec[] = [
  ["DOGESEND.cbl", "cobol/DOGESEND.cbl", "cobol"],
  ["DOGESEND.v0.cbl", "captures/run1/DOGESEND.v0.cbl", "cobol"],
  ["DOGESEND.v1.cbl", "captures/run1/DOGESEND.v1.cbl", "cobol"],
  ["DOGESEND.v2.cbl", "captures/run1/DOGESEND.v2.cbl", "cobol"],
  ["DOGESEND.v1.diff", "captures/run1/DOGESEND.v1.diff", "diff"],
  ["DOGESEND.v2.diff", "captures/run1/DOGESEND.v2.diff", "diff"],
  ["DOGEMAIN.cbl", "cobol/DOGEMAIN.cbl", "cobol"],
  ["COMPSEND.jcl", "jcl/COMPSEND.jcl", "jcl"],
  ["COMPCOBL.jcl", "jcl/COMPCOBL.jcl", "jcl"],
  ["atm.ts", "atm/atm.ts", "typescript"],
  ["atm.regression.test.ts", "test/atm.regression.test.ts", "typescript"],
  ["atm.limit.test.ts", "test/atm.limit.test.ts", "typescript"],
  ["AGENTS.md", "AGENTS.md", "markdown"],
];

const DIAG_RE = /IEF142I|IKF\d+I-|RC= /;

function jobExcerpt(read: (r: string) => string, relPath: string): { lines: string[]; diagnostics: string[] } {
  const all = read(relPath).split("\n");
  return {
    lines: all.slice(0, 60),
    diagnostics: all.filter((l) => DIAG_RE.test(l)),
  };
}

/**
 * The RC 12 recompile (job-rc12-rerun-JOB00039.outlist, PW-request 2026-09-25):
 * pulls just the COB1 condition-code line and the UNSTRING/INSPECT error
 * block out of a 2500+ line listing, not every diagnostic in the file — the
 * compile also carries unrelated pre-existing PICTURE-CLAUSE warnings this
 * story isn't about. A matched line that wraps (no trailing period) picks
 * up its continuation line, skipping the printer's blank spacer lines.
 */
function extractRc12(read: (r: string) => string, relPath: string): { condCode: string; errorBlock: string[] } {
  const lines = read(relPath).split("\n");
  const condCode = (lines.find((l) => /IEF142I.*COB1.*COND CODE/.test(l)) ?? "").trim();
  const detailRe = /IKF(1086|4003|3001)I-[EW]/;
  const block: string[] = [];
  const summap = lines.find((l) => /IKF6006I-E/.test(l));
  if (summap) block.push(summap.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!detailRe.test(line)) continue;
    let text = line.trim();
    if (!text.endsWith(".")) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j]!.trim() === "") continue;
        if (/^\s{15,}\S/.test(lines[j]!) && !detailRe.test(lines[j]!)) text += " " + lines[j]!.trim();
        break;
      }
    }
    block.push(text);
  }
  return { condCode, errorBlock: block };
}

function buildDogecicsCaptures(): unknown {
  const read = makeRead(DOGECICS_EX_ROOT);
  const svgs: Record<string, string> = {
    ...readSvgDir(DOGECICS_EX_ROOT, "captures/run1/atm-after-50000"),
    ...readSvgDir(DOGECICS_EX_ROOT, "captures/run1/atm-before-50000"),
  };
  return {
    ansi: {
      // vitest-1-regression.ansi already carries the full per-test ✓ lines
      // (verbose reporter output), not just a compact summary.
      "vitest-1-regression": read("captures/run1/vitest-1-regression.ansi"),
      "vitest-2-limit-red": read("captures/run1/vitest-2-limit-red.ansi"),
      "vitest-3-after-v2": read("captures/run1/vitest-3-after-v2.ansi"),
    },
    hostLog: read("captures/run1/host-run1.txt"),
    searchGrep: read("captures/run1/search-grep.txt"),
    planMd: read("captures/run1/plan.md"),
    promptMd: read("captures/run1/prompt.md"),
    atmAfter50000: read("captures/run1/atm-after-50000.txt"),
    atmAfter05: read("captures/run1/atm-after-0.5.txt"),
    atmBefore50000: read("captures/run1/atm-before-50000.txt"),
    timings: parseTimings(read("captures/run1/timings.jsonl")),
    jobs: {
      JOB00038: jobExcerpt(read, "captures/run1/job-JOB00038.outlist"),
    },
    // job-JOB00037.outlist no longer exists (the original capture lost it to
    // an idle-timeout — see host-run1.txt); job-rc12-rerun-JOB00039.outlist
    // is an identical recompile of the same v1 source, captured 2026-09-25.
    rc12: extractRc12(read, "captures/run1/job-rc12-rerun-JOB00039.outlist"),
    svgs,
  };
}

const DOGECICS_CAPTURES_TYPES =
  `export interface TimingRow {\n  stage: string;\n  t: string;\n  epochMs: number;\n  note: string;\n}\n\n` +
  `export interface JobExcerpt {\n  lines: string[];\n  diagnostics: string[];\n}\n\n` +
  `export interface Rc12Excerpt {\n  condCode: string;\n  errorBlock: string[];\n}\n`;

// ============================================================================
// TECHUTEX — captures/run1 (cobol-cowboys / DOT500, Endevor + HB.js)
// ============================================================================

const TECHUTEX_CODE_FILES: CodeFileSpec[] = [
  ["DOT500.v0.cbl", "captures/run1/code/cobol/DOT500.v0.cbl", "cobol"],
  ["DOT500.v1.cbl", "captures/run1/code/cobol/DOT500.v1.cbl", "cobol"],
  ["DOT500.v2.cbl", "captures/run1/code/cobol/DOT500.v2.cbl", "cobol"],
  ["DOT500.v1.diff", "captures/run1/code/cobol/DOT500.v1.diff", "diff"],
  ["DOT500.v2.diff", "captures/run1/code/cobol/DOT500.v2.diff", "diff"],
  ["postDebit.js", "captures/run1/code/js/postDebit.js", "javascript"],
  ["getCheckingBalances.js", "captures/run1/code/js/getCheckingBalances.js", "javascript"],
  ["dot.regression.test.js", "captures/run1/code/js/dot.regression.test.js", "javascript"],
  ["dot.dailyLimit.test.js", "captures/run1/code/js/dot.dailyLimit.test.js", "javascript"],
  // This app's own draft (not part of the real archive — see
  // CAPTURES-WANTED.md's "Provenance notes" and MANIFEST.md) — written by
  // the same run that split this demo out of the kit, kept alongside the
  // rest of captures/run1 for the same
  // reason DOGECICS's real AGENTS.md lives next to ITS captures.
  ["AGENTS.md", "captures/run1/code/AGENTS.md", "markdown"],
];

/**
 * Compiler diagnostics out of one `generate-N-DOT500-build.txt` listing —
 * the PP 5655-EC6 banner through "Return code N", trimmed to the message
 * table (LineID/code/text rows), not the syncz/bldz wrapper noise around
 * it. A CLEAN compile prints no PP banner at all (no messages to print) —
 * its return code comes from the task's own "exit code: N" line instead,
 * and its "lines" are just the build-succeeded summary, not a diagnostic
 * table there isn't one of.
 */
function extractListingDiagnostics(text: string): { lines: string[]; returnCode: number | null } {
  const all = text.split("\n");
  const bannerIdx = all.findIndex((l) => /^PP 5655-EC6/.test(l));
  const rcLine = all.find((l) => /^\s*Return code \d+/.test(l)) ?? all.find((l) => /^exit code: \d+/.test(l));
  const rcMatch = rcLine ? /(?:Return code|exit code:) (\d+)/.exec(rcLine) : null;
  const returnCode = rcMatch ? Number(rcMatch[1]) : null;
  if (bannerIdx === -1) {
    const succeededIdx = all.findIndex((l) => /build succeeded/.test(l));
    const start = succeededIdx === -1 ? Math.max(0, all.length - 20) : Math.max(0, succeededIdx - 2);
    return { lines: all.slice(start, start + 20), returnCode };
  }
  const endIdx = all.findIndex((l, i) => i > bannerIdx && /^\s*Return code \d+/.test(l));
  const end = endIdx === -1 ? Math.min(bannerIdx + 45, all.length) : endIdx + 1;
  return { lines: all.slice(bannerIdx, end), returnCode };
}

/**
 * Characters typed to make DOT500.v2 (the final, deployed source) — every
 * "+" line of the real v2 diff (excluding the "+++ " file header), each
 * counted WITH its own line break (a line takes an Enter too). Computed
 * here from the real captured diff, never hand-typed — see
 * manualTimings.ts's own comment for where this number is used and cited.
 */
function countDiffAddedChars(diffText: string): number {
  const added = diffText.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  return added.reduce((sum, l) => sum + l.slice(1).length + 1, 0);
}

interface EndevorCallRow {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  epochMs: number;
  invented: boolean;
  inventedNote?: string;
}

function parseJsonl<T>(text: string): T[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

/**
 * Demo substitutions applied to the SVG STRING of the three DOT5 screens
 * (captures/run1/screens/02-dot5-filled.svg, 03-dot5-rejected.svg,
 * 04-dot5-accepted.svg — keyed here as prerendered, "dot5/NN-name") — never
 * edited on disk, the captures stay real. The real run's screens show a
 * $50.00 debit (AMOUNT 1 field text "00000005000", 11 digits = cents) on
 * accounts "DEMO" (02, unfilled placeholder) / "101123456" (03) /
 * "901123456" (04) (ACCOUNT KEY, a 20-char field, space-padded), while the
 * ATM face next to this panel shows the demo's own $200000.00 fictional
 * debit on the demo account (config.ts's DEMO_DEBIT_AMOUNT) — owner: "The
 * CICS screen shows old amount." Every `from` here must be the SAME LENGTH
 * as its `to` (a fixed-width 3270 field can't grow or shrink) and must
 * actually occur in the source — both asserted in applyDot5Substitutions
 * below, so a re-capture that changes these screens fails the build loudly
 * instead of silently shipping a stale table.
 */
const DOT5_SCREEN_SUBSTITUTIONS: Record<string, Array<[from: string, to: string]>> = {
  "dot5/02-filled": [
    ["00000005000", "00020000000"], // AMOUNT 1: $50.00 -> $200000.00 (cents, 11 digits)
    ["DEMO                ", "101123456           "], // ACCOUNT KEY: unfilled placeholder -> the demo account
  ],
  "dot5/03-rejected": [
    ["00000005000", "00020000000"], // AMOUNT 1 only — ACCOUNT KEY already reads 101123456
  ],
  "dot5/04-accepted": [
    ["00000005000", "00020000000"], // AMOUNT 1
    ["901123456           ", "101123456           "], // ACCOUNT KEY: the other real account -> the demo account
  ],
};

function applyDot5Substitutions(key: string, svg: string): string {
  const subs = DOT5_SCREEN_SUBSTITUTIONS[key];
  if (!subs) return svg;
  let out = svg;
  for (const [from, to] of subs) {
    if (from.length !== to.length) {
      throw new Error(
        `prerender: DOT5 substitution length mismatch for "${key}": "${from}" (${from.length}) -> "${to}" (${to.length})`,
      );
    }
    if (!out.includes(from)) {
      throw new Error(
        `prerender: DOT5 substitution needle "${from}" not found in "${key}" — the capture may have changed; update DOT5_SCREEN_SUBSTITUTIONS`,
      );
    }
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * The 5 real Panelwright screen captures (captures/run1/screens/) — flat
 * NN-name.svg files, not DOGECICS's per-step subdirectories, so they need
 * their own key mapping instead of readSvgDir's generic basename(dir)
 * prefix: 01-04 are the DOT5 screen (keyed "dot5/NN-name"), 05 is the AIS2
 * balances screen (keyed "ais2/05-balances"). The three DOT5_SCREEN
 * _SUBSTITUTIONS keys get their demo amount/account swapped in here, over
 * the real captured bytes — see that table's own header comment.
 */
function readTechutexScreens(exRoot: string): Record<string, string> {
  const dir = "captures/run1/screens";
  const files = readdirSync(path.join(exRoot, dir)).filter((f) => f.endsWith(".svg"));
  const out: Record<string, string> = {};
  for (const f of files) {
    const stem = f.replace(/\.svg$/, ""); // e.g. "03-dot5-rejected" or "05-ais2-balances"
    const prefix = stem.includes("ais2") ? "ais2" : "dot5";
    const shortName = stem.replace(`-${prefix}-`, "-"); // "03-dot5-rejected" -> "03-rejected"
    const key = `${prefix}/${shortName}`;
    out[key] = applyDot5Substitutions(key, readFileSync(path.join(exRoot, dir, f), "utf8"));
  }
  return out;
}

function buildTechutexCaptures(): unknown {
  const read = makeRead(TECHUTEX_EX_ROOT);
  const v2Diff = read("captures/run1/code/cobol/DOT500.v2.diff");
  const dailyLimitTest = read("captures/run1/code/js/dot.dailyLimit.test.js");
  return {
    svgs: readTechutexScreens(TECHUTEX_EX_ROOT),
    // Analogous to DOGECICS's `ansi` — plain hand-rolled test-runner
    // transcripts (Terminal.tsx colors "PASS:"/"FAIL:"/"$ " lines), not a
    // vitest reporter's ANSI output.
    logs: {
      "run-1-regression": read("captures/run1/tests/run-1-regression.txt"),
      "run-2-new-test-red": read("captures/run1/tests/run-2-new-test-red.txt"),
      "run-3-regression-after": read("captures/run1/tests/run-3-regression-after.txt"),
      "run-4-new-test-green": read("captures/run1/tests/run-4-new-test-green.txt"),
      "hb-log": read("captures/run1/session/hb-log.txt"),
      "deploy-log": read("captures/run1/session/deploy-log.txt"),
    },
    planMd: read("captures/run1/session/plan.md"),
    promptMd: read("captures/run1/session/prompt.md"),
    timings: parseTimings(read("captures/run1/session/timings-from-transcript.jsonl")),
    endevorCalls: parseJsonl<EndevorCallRow>(read("captures/run1/session/mcp/endevor-calls.jsonl")),
    listings: {
      generate1: extractListingDiagnostics(read("captures/run1/listings/generate-1-DOT500-build.txt")),
      generate2: extractListingDiagnostics(read("captures/run1/listings/generate-2-DOT500-build.txt")),
      generate3: extractListingDiagnostics(read("captures/run1/listings/generate-3-DOT500-build.txt")),
    },
    // Computed, never hand-typed — manualTimings.ts cites these two.
    v2DiffAddedChars: countDiffAddedChars(v2Diff),
    dailyLimitTestChars: dailyLimitTest.length,
  };
}

const TECHUTEX_CAPTURES_TYPES =
  `export interface TimingRow {\n  stage: string;\n  t: string;\n  epochMs: number;\n  note: string;\n}\n\n` +
  `export interface ListingExcerpt {\n  lines: string[];\n  returnCode: number | null;\n}\n\n` +
  `export interface EndevorCallRow {\n  tool: string;\n  input: Record<string, unknown>;\n  output: unknown;\n  epochMs: number;\n  invented: boolean;\n  inventedNote?: string;\n}\n`;

// ============================================================================
// Drive both demos through the shared pipeline.
// ============================================================================

interface DemoSources {
  id: string;
  exRoot: string;
  codeFiles: CodeFileSpec[];
  buildCaptures: () => unknown;
  capturesTypes: string;
}

const DEMOS: DemoSources[] = [
  {
    id: "dogecics",
    exRoot: DOGECICS_EX_ROOT,
    codeFiles: DOGECICS_CODE_FILES,
    buildCaptures: buildDogecicsCaptures,
    capturesTypes: DOGECICS_CAPTURES_TYPES,
  },
  {
    id: "techutex",
    exRoot: TECHUTEX_EX_ROOT,
    codeFiles: TECHUTEX_CODE_FILES,
    buildCaptures: buildTechutexCaptures,
    capturesTypes: TECHUTEX_CAPTURES_TYPES,
  },
];

let totalCode = 0;
let totalSvgs = 0;
for (const demo of DEMOS) {
  const genDir = path.join(GEN_ROOT, demo.id);
  const code = renderCodeFiles(demo.exRoot, demo.codeFiles);
  writeCodeModule(genDir, code);
  totalCode += Object.keys(code).length;
  const captures = demo.buildCaptures();
  writeCapturesModule(genDir, demo.capturesTypes, captures);
  const svgs = (captures as { svgs?: Record<string, string> }).svgs;
  if (svgs) totalSvgs += Object.keys(svgs).length;
}

console.log(`prerender: wrote ${totalCode} code entries across ${DEMOS.length} demos, ${totalSvgs} svgs`);
