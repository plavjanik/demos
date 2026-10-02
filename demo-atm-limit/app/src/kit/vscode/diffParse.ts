/**
 * Pure parser for a unified diff (`diff -u` / `git diff` output) into the
 * rows a VS Code-style INLINE diff editor renders: each body line keeps
 * its own old/new line number and add/del/context kind, with a hunk
 * boundary turned into its own separator row (VS Code's collapsed-region
 * bar) — never the raw "@@ -a,b +c,d @@" header text. Demo- and shiki-
 * agnostic (no fs, no highlighting) so it can be unit-tested directly and
 * imported from both scripts/prerender.mts's build-time renderer (which
 * feeds these rows into a shiki transformer, keyed by line number) and,
 * were a demo ever to need it, kit runtime code — see kit-boundary.test.ts
 * for why this lives in src/kit rather than the script itself.
 */

export interface DiffContentLine {
  kind: "ctx" | "add" | "del";
  /** Present for "ctx"/"del" — the line's 1-indexed position in the OLD file. */
  oldNo?: number;
  /** Present for "ctx"/"add" — the line's 1-indexed position in the NEW file. */
  newNo?: number;
  /** The line with its leading " "/"+"/"-" diff-format marker stripped — never re-shown; the indicator column carries that meaning instead. */
  text: string;
}

export interface DiffSepRow {
  kind: "sep";
}

export type DiffRow = DiffContentLine | DiffSepRow;

export interface ParsedDiff {
  /** The "---"/"+++" header paths, verbatim (an "a/..."/"b/..." pair, or a plain relative path — captured tools vary) — used only for language inference (see inferDiffLang below), never rendered. */
  oldFile?: string;
  newFile?: string;
  rows: DiffRow[];
}

const HUNK_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Narrows a DiffRow to its content-line variant — the rows a code-viewer actually highlights/numbers, i.e. every row but a hunk separator. */
export function isContentRow(row: DiffRow): row is DiffContentLine {
  return row.kind !== "sep";
}

/**
 * Parses one unified diff's text (a single file's `diff`, as this app's
 * DemoSources tables always capture — never a multi-file `diff --git`
 * archive) into ordered rows. Tolerant of both captured shapes seen in
 * this repo's own fixtures: a full `diff --git`/`index`/`---`/`+++`
 * header (Techutex's DOT500 diffs), and a bare `---`/`+++` pair with no
 * `diff --git`/`index` lines at all (DOGECICS's DOGESEND diffs).
 */
export function parseUnifiedDiff(diffText: string): ParsedDiff {
  // A trailing newline (every captured .diff file has one) would otherwise
  // split() into one extra empty element that reads as a genuine blank
  // CONTEXT line below — strip exactly that one artifact, not any blank
  // line the diff itself actually contains.
  const raw = diffText.endsWith("\n") ? diffText.slice(0, -1) : diffText;
  const lines = raw.split("\n");

  let oldFile: string | undefined;
  let newFile: string | undefined;
  const rows: DiffRow[] = [];
  let oldNo = 0;
  let newNo = 0;
  let inHunk = false;
  let sawHunk = false;

  for (const line of lines) {
    if (line.startsWith("diff --git") || line.startsWith("index ")) continue;
    if (line.startsWith("--- ")) {
      oldFile = line.slice(4).split("\t")[0]!.trim();
      continue;
    }
    if (line.startsWith("+++ ")) {
      newFile = line.slice(4).split("\t")[0]!.trim();
      continue;
    }
    const hunk = HUNK_RE.exec(line);
    if (hunk) {
      // Only a boundary BETWEEN two hunks is a collapsed-region bar — the
      // very first hunk starts the document, nothing to collapse above it.
      if (sawHunk) rows.push({ kind: "sep" });
      sawHunk = true;
      inHunk = true;
      oldNo = Number(hunk[1]);
      newNo = Number(hunk[2]);
      continue;
    }
    if (!inHunk) continue; // stray text outside any hunk (there shouldn't be any)
    if (line.startsWith("\\")) continue; // "\ No newline at end of file"

    const marker = line[0];
    if (marker === "+") {
      rows.push({ kind: "add", newNo: newNo++, text: line.slice(1) });
    } else if (marker === "-") {
      rows.push({ kind: "del", oldNo: oldNo++, text: line.slice(1) });
    } else if (marker === " ") {
      rows.push({ kind: "ctx", oldNo: oldNo++, newNo: newNo++, text: line.slice(1) });
    } else if (line === "") {
      // A genuinely blank CONTEXT line — some diff tools strip the single
      // marker space a truly empty line would otherwise carry. Only reading
      // consistent with the hunk header's own declared old/new line counts.
      rows.push({ kind: "ctx", oldNo: oldNo++, newNo: newNo++, text: "" });
    }
    // Any other marker shouldn't occur in a clean unified diff; dropped
    // rather than mis-numbered.
  }

  return { oldFile, newFile, rows };
}

/**
 * Infers a shiki lang id from the diff's own `---`/`+++` header paths —
 * `.cbl`/`.cob`/`.cobol` (case-insensitive) -> `cobolLangId`, else
 * `plainLangId`. Prefers the NEW (`+++`) path (the file as it now reads),
 * falling back to the OLD one — a rename that drops the extension on one
 * side is still recognisable from the other.
 */
export function inferDiffLangFromHeader(
  diff: Pick<ParsedDiff, "oldFile" | "newFile">,
  cobolLangId: string,
  plainLangId: string,
): string {
  const EXT_RE = /\.(cbl|cob|cobol)$/i;
  if (diff.newFile && EXT_RE.test(diff.newFile)) return cobolLangId;
  if (diff.oldFile && EXT_RE.test(diff.oldFile)) return cobolLangId;
  return plainLangId;
}
