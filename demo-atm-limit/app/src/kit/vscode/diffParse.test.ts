import { describe, expect, test } from "vitest";
import { inferDiffLangFromHeader, isContentRow, parseUnifiedDiff } from "./diffParse";

const TWO_HUNK_DIFF =
  `diff --git a/src/dot/files/cobol/DOT500 b/src/dot/files/cobol/DOT500\n` +
  `index c1b9591..431e6d0 100644\n` +
  `--- a/src/dot/files/cobol/DOT500\n` +
  `+++ b/src/dot/files/cobol/DOT500\n` +
  `@@ -114,3 +114,5 @@\n` +
  ` 011200\n` +
  ` 011300     CTX-A\n` +
  `+\n` +
  `+           NEW-LINE\n` +
  ` 011400     CTX-B\n` +
  `@@ -200,3 +202,2 @@\n` +
  ` 020000     CTX-C\n` +
  `-           OLD-LINE\n` +
  ` 020100     CTX-D\n`;

describe("parseUnifiedDiff", () => {
  test("numbers old/new lines independently across two hunks, with a separator between them", () => {
    const { rows } = parseUnifiedDiff(TWO_HUNK_DIFF);

    // First hunk: no separator ahead of it (nothing to collapse above the
    // very first hunk) — starts straight at its two context lines.
    expect(rows[0]).toEqual({ kind: "ctx", oldNo: 114, newNo: 114, text: "011200" });
    expect(rows[1]).toEqual({ kind: "ctx", oldNo: 115, newNo: 115, text: "011300     CTX-A" });
    // A bare "+" line (no trailing space) is a blank ADDED line, not dropped.
    expect(rows[2]).toEqual({ kind: "add", newNo: 116, text: "" });
    expect(rows[3]).toEqual({ kind: "add", newNo: 117, text: "           NEW-LINE" });
    expect(rows[4]).toEqual({ kind: "ctx", oldNo: 116, newNo: 118, text: "011400     CTX-B" });

    // The second hunk's own header starts a fresh old/new numbering
    // (114-ish -> 200-ish) — a real hunk boundary, not a continuation.
    expect(rows[5]).toEqual({ kind: "sep" });
    expect(rows[6]).toEqual({ kind: "ctx", oldNo: 200, newNo: 202, text: "020000     CTX-C" });
    expect(rows[7]).toEqual({ kind: "del", oldNo: 201, text: "           OLD-LINE" });
    // The deletion advances only the OLD side — the next context line's new
    // number continues from the new side alone (202 -> 203), proving old
    // and new numbering really do run independently past a del row.
    expect(rows[8]).toEqual({ kind: "ctx", oldNo: 202, newNo: 203, text: "020100     CTX-D" });

    expect(rows.filter((r) => r.kind === "sep")).toHaveLength(1);
    expect(rows.filter(isContentRow)).toHaveLength(8);
  });

  test("captures the --- / +++ header paths even with no diff --git/index lines (DOGECICS's captured shape)", () => {
    const diff =
      `--- captures/run1/DOGESEND.v0.cbl\t2026-09-24 23:08:22\n` +
      `+++ cobol/DOGESEND.cbl\t2026-09-24 23:08:22\n` +
      `@@ -1,1 +1,1 @@\n` +
      ` ONE LINE\n`;
    const parsed = parseUnifiedDiff(diff);
    expect(parsed.oldFile).toBe("captures/run1/DOGESEND.v0.cbl");
    expect(parsed.newFile).toBe("cobol/DOGESEND.cbl");
    expect(parsed.rows).toEqual([{ kind: "ctx", oldNo: 1, newNo: 1, text: "ONE LINE" }]);
  });

  test("ignores a trailing newline without misreading it as a blank context line", () => {
    const diff = `--- a/f\n+++ b/f\n@@ -1,1 +1,1 @@\n context\n`;
    const parsed = parseUnifiedDiff(diff);
    expect(parsed.rows).toEqual([{ kind: "ctx", oldNo: 1, newNo: 1, text: "context" }]);
  });
});

describe("inferDiffLangFromHeader", () => {
  test("recognises .cbl/.cob/.cobol on either header path, preferring the new (+++) side", () => {
    expect(inferDiffLangFromHeader({ oldFile: "a/DOGESEND.cbl", newFile: "b/DOGESEND.cbl" }, "cobol", "text")).toBe(
      "cobol",
    );
    expect(inferDiffLangFromHeader({ oldFile: "a/x.COB", newFile: undefined }, "cobol", "text")).toBe("cobol");
    expect(inferDiffLangFromHeader({ oldFile: "a/x.cobol", newFile: "b/x" }, "cobol", "text")).toBe("cobol");
  });

  test("falls back to plain when neither header path has a recognised extension (Techutex's DOT500 diffs)", () => {
    expect(
      inferDiffLangFromHeader(
        { oldFile: "a/src/dot/files/cobol/DOT500", newFile: "b/src/dot/files/cobol/DOT500" },
        "cobol",
        "text",
      ),
    ).toBe("text");
  });
});
