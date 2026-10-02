/**
 * Live measurement of the MANUAL operator path for the same DOGESEND
 * daily-limit change the agent loop made (captures/run1/): logon, REVEDIT
 * navigation and insert/delete mechanics, SUBMIT, paging the compile
 * listing on the terminal, a KICKS restart, and four hand tests at the
 * DSND screen — mirrored keystroke-for-keystroke against what a human
 * operator does at a 3270 terminal, not a shortcut through any API a human
 * wouldn't have. Every stage stamps wall-clock time to
 * captures/manual1/timings.jsonl; screen/round-trip counts are recorded
 * where an operator would have had to read or scroll a screen. The edited
 * member is a COPY (DOGESNDZ), never the real DOGESEND — the real member
 * and its regression tests are untouched.
 *
 * Operator-fidelity rule: the script types at machine speed, so the
 * elapsed time it measures is everything BUT typing — navigation, editor
 * mechanics, host round trips, compile wait, listing paging, KICKS
 * restart, hand tests. The character/line counts of the COBOL typed are
 * recorded in the edit stage's note so a report can apply a human typing
 * rate separately.
 *
 * Run: npx tsx demo-atm-limit/scripts/manual-path.ts
 *
 * STATUS (2026-09-25): built end to end, but never completed a timed run —
 * scratch-member creation in HERC02.DOGECICS fails (IND$FILE PUT and, after
 * ~20 cycles, REVEDIT too); see captures/manual1/README.md for the evidence.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "@panelwright/core";
import type { Session } from "@panelwright/core";
import { enterCommand, pressThrough, rowText, tsoLogon } from "../atm/screen.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLE_ROOT = path.resolve(HERE, "..");
const CAPTURE_DIR = path.join(EXAMPLE_ROOT, "captures", "manual1");
const TIMINGS_PATH = path.join(CAPTURE_DIR, "timings.jsonl");
const V0_CBL_PATH = path.join(EXAMPLE_ROOT, "captures", "run1", "DOGESEND.v0.cbl");
const V2_CBL_PATH = path.join(EXAMPLE_ROOT, "captures", "run1", "DOGESEND.v2.cbl");
const COMPSEND_JCL_PATH = path.join(EXAMPLE_ROOT, "jcl", "COMPSEND.jcl");

const HOST = process.env["TK5_HOST"] ?? "localhost";
const PORT = Number(process.env["TK5_PORT"] ?? 3271);
const USER = process.env["TK5_USER"] ?? "HERC02";
const PASS = process.env["TK5_PASS"] ?? "CUL8TR";

// DOGESND2/COMPSND2 (and DOGESND1/COMPSND1) carry stale REVEDIT
// crash-recovery state from earlier debugging of this same script —
// measured live, "****ZAP****AUTOSAVE**********" on the TOP/BOTTOM OF
// DATA line refused every insert command REGARDLESS of entry route
// (direct REVED command or the ISPF ENTRY PANEL), and neither a DELETE
// nor a re-open cleared it. A DSN a crashed attempt never touched sidesteps
// it entirely — see Flags in the final report for the exact symptom.
const DSN_MEMBER = "HERC02.DOGECICS(DOGESNDZ)";
const JCL_MEMBER = "HERC02.DOGECICS(COMPSNDZ)";
const DSN_MEMBER_NAME = /\(([^)]+)\)/.exec(DSN_MEMBER)![1]!;
const TO_ADDRESS = "DEMO1ATMWALLETADDRESSXXXXXXXXXXXXX";

// --- v2 line ranges (1-based, per captures/run1/DOGESEND.v2.diff): the
// working-storage block inserted after TEXT-CURRENCY, and the replacement
// procedure-division block (MOVE-SOME-DOGE's rewritten IF plus the five new
// paragraphs) inserted after the "incase" comment, once the old 26-line
// body is deleted. Read from the real file rather than transcribed, so a
// mismatch in this script can never silently diverge from the artifact the
// agent run already compiled.
const v2Lines = fs.readFileSync(V2_CBL_PATH, "utf8").split(/\r?\n/);
const WS_BLOCK = v2Lines.slice(36, 83); // v2 lines 37..83 (47 lines)
const PROC_BLOCK = v2Lines.slice(168, 275); // v2 lines 169..275 (107 lines)

function log(msg: string): void {
  console.log(msg);
}

function progress(msg: string): void {
  const stamp = new Date().toTimeString().slice(0, 8);
  try {
    fs.appendFileSync("/tmp/panelwright-agents.log", `${stamp} manual-path: ${msg}\n`);
  } catch {
    // best effort
  }
}

interface Stamp {
  stage: string;
  t: number;
  epochMs: number;
  note: string;
}

function appendStamp(s: Stamp): void {
  fs.appendFileSync(TIMINGS_PATH, `${JSON.stringify(s)}\n`);
  log(`STAMP ${s.stage}: ${s.t}s — ${s.note}`);
}

async function stage<T extends { note: string } | void>(name: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  progress(`stage start: ${name}`);
  try {
    const result = await fn();
    const note = result && typeof result === "object" && "note" in result ? (result as { note: string }).note : "";
    appendStamp({ stage: name, t: Number(((Date.now() - t0) / 1000).toFixed(3)), epochMs: Date.now(), note });
    progress(`stage done: ${name}`);
    return result as T;
  } catch (err) {
    appendStamp({
      stage: name,
      t: Number(((Date.now() - t0) / 1000).toFixed(3)),
      epochMs: Date.now(),
      note: `THREW: ${err instanceof Error ? err.message : String(err)}`,
    });
    progress(`stage FAILED: ${name} — ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function settle(session: Session, quiet = 600, timeoutMs = 6000): Promise<void> {
  await session.waitFor({ quiet }, { timeoutMs }).catch(() => {});
}

/**
 * Hard escape when normal navigation is stuck on something neither PF3 nor
 * CANCEL clears: PA1 (an attention interrupt, works even with an otherwise
 * wedged keyboard — root CLAUDE.md's "PA1 is the escape hatch out of a
 * repaint loop"), CLEAR to reach a plain screen, then LOGOFF once more
 * (`enterCommand` picks `typeRaw` vs a real field on its own). Genuinely
 * the LAST resort before giving up — a strand costs a container restart.
 */
async function lastResortLogoff(session: Session): Promise<boolean> {
  await session.press("PA1");
  await settle(session, 800, 6000);
  await session.press("CLEAR");
  await settle(session, 800, 6000);
  enterCommand(session, "LOGOFF");
  await session.press("ENTER");
  await pressThrough(session, /Logon\s*===>|Terminal\s+CUU/i, 5);
  return /Logon\s*===>|Terminal\s+CUU/i.test(session.render({ mode: "full" }));
}

/**
 * Best-effort LOGOFF from whatever screen is current, PF3-unwinding through
 * ISPF first if needed. Every stage that can fail BEFORE the main scenario's
 * own try/finally takes over (i.e. `setup()`, which runs on its own
 * connection) must call this in its own `finally` — a plain `session.close()`
 * on error leaves HERC02 logged on with the socket just dropped, which
 * strands the userid IN USE exactly like a crash (measured live: the first
 * run of this script did precisely that when a transfer rejected, and only
 * a container restart — outside this script's authority — clears it).
 */
async function logoffFromReady(session: Session): Promise<void> {
  for (
    let i = 0;
    i < 12 &&
    !/\bREADY\b/.test(session.render({ mode: "full" })) &&
    !/primary option menu/i.test(session.render({ mode: "full" }));
    i++
  ) {
    // An editor line-command error ("INVALID ON THIS LINE") can eat a
    // bare PF3 without exiting — ENTER first to dismiss it, then PF3.
    if (/INVALID|ERROR/i.test(session.render({ mode: "full" }))) {
      await session.press("ENTER");
      await settle(session);
    }
    await session.press("PF3");
    await settle(session);
  }
  if (
    !/primary option menu/i.test(session.render({ mode: "full" })) &&
    !/\bREADY\b/.test(session.render({ mode: "full" }))
  ) {
    // Still stuck — CANCEL is the common ISPF Edit escape that abandons
    // whatever the editor is doing regardless of an unresolved error.
    session.type({ at: { row: 1, col: 14 } }, "CANCEL");
    await session.press("ENTER");
    await settle(session, 800, 8000);
    for (
      let i = 0;
      i < 6 &&
      !/primary option menu/i.test(session.render({ mode: "full" })) &&
      !/\bREADY\b/.test(session.render({ mode: "full" }));
      i++
    ) {
      await session.press("PF3");
      await settle(session);
    }
  }
  if (/primary option menu/i.test(session.render({ mode: "full" }))) {
    enterCommand(session, "END");
    await session.press("ENTER");
    await settle(session, 800, 8000);
  }
  if (/\bREADY\b/.test(session.render({ mode: "full" }))) {
    enterCommand(session, "LOGOFF");
    await session.press("ENTER");
    await pressThrough(session, /Logon\s*===>|Terminal\s+CUU/i, 5);
    return;
  }
  const recovered = await lastResortLogoff(session).catch(() => false);
  if (!recovered) {
    log("WARNING: logoffFromReady never reached READY — HERC02 may be stranded IN USE");
    log(`=== FINAL SCREEN === ${session.render({ mode: "compact" }).slice(0, 400)}`);
  }
}

// ---- REVEDIT editing mechanics --------------------------------------------

/** Any field wide enough to be a data-line text field, not the 6-char prefix. */
function findRowByText(session: Session, substring: string): number | undefined {
  const fields = session.fields();
  for (const f of fields) {
    if (f.length >= 30 && f.value.includes(substring)) return f.row;
  }
  return undefined;
}

/**
 * The row of the TOP/BOTTOM OF DATA boundary marker, with NO field-length
 * filter — unlike a data line's one long text field, this banner's "OF
 * DATA" text sits in a short field of its own (measured live: `findRowByText`'s
 * `length >= 30` filter, tuned for real 72-char COBOL lines, silently
 * missed it every time, even with the text plainly visible in a full
 * render, because the boundary line is built from several short
 * highlighted spans rather than one long field).
 */
/**
 * The row of the TOP/BOTTOM OF DATA boundary marker, found by its PREFIX
 * field's own value (a repeated-asterisk placeholder, e.g. `"******"` —
 * tk5-quickref.md §6: "TOP OF DATA/BOTTOM OF DATA boundary rows have
 * their own prefix field (prefix renders `******`)"). Matching on the
 * banner's descriptive TEXT ("...BOTTOM OF DATA...") does not work — it
 * is plainly visible in a full render but `session.fields()` never
 * reports it as part of any field at all (measured live: painted directly
 * with no preceding field-start order, so it is background screen
 * content, not addressable field data); the prefix marker is a real field
 * and is what this needs to type into anyway.
 */
function findBoundaryRow(session: Session): number | undefined {
  const fields = session.fields();
  for (const f of fields) {
    if (f.length <= 10 && f.col <= 6 && /^\*+$/.test(f.value.trim())) return f.row;
  }
  return undefined;
}

function prefixFieldAt(session: Session, row: number): { row: number; col: number } | undefined {
  const fields = session.fields();
  const f = fields.find((x) => x.row === row && x.length <= 10 && x.col <= 6);
  return f ? { row: f.row, col: f.col } : undefined;
}

async function editorFind(session: Session, text: string): Promise<void> {
  session.type({ at: { row: 1, col: 14 } }, `FIND ${text}`);
  await session.press("ENTER");
  await settle(session);
}

/** Rows below `afterRow`, in order, whose text field is a blank (not yet materialized) insert prompt. */
function collectPromptRows(session: Session, afterRow: number): number[] {
  const fields = session.fields();
  return fields
    .filter((f) => f.row > afterRow && f.length >= 30 && f.value.trim() === "")
    .map((f) => f.row)
    .sort((a, b) => a - b);
}

/**
 * Insert `lines` after the row FIND locates for `anchorSubstring`, in
 * screen-sized batches: I<n> opens n blank insert-prompt lines, each
 * visible text field gets one line, one ENTER materializes the whole
 * batch — the same mechanics `tk5-edit-smoke.ts` proved for a single line,
 * scaled to a screenful at a time (brief's "~20 lines visible, ENTER,
 * scroll (PF8), repeat"). BATCH is kept comfortably under the ~19-21 data
 * rows a 24x80 REVEDIT screen shows, so a request never spans more than
 * one screen — the one assumption this whole function leans on, because
 * an untyped insert-prompt COLLAPSES on ENTER (measured on the original
 * new-member editor smoke) and a batch that outruns the visible screen
 * risks silently dropping lines nobody typed into yet.
 */
/**
 * Core batch-insert loop, shared by `editorInsertBlock()` (FIND an anchor
 * substring first) and `populateNewMember()` (a brand-new member already
 * shows ~19 blank insert-prompt rows from row 3 on — tk5-edit-smoke.ts's
 * measured shape — so its FIRST batch has nothing to open; every batch
 * after that opens its own via I<n>, same as the anchored case).
 */
/** Rows > 1 (below the COMMAND/SCROLL line), regardless of any stale anchor — used after a scroll, when the previous anchor row number no longer means anything on the new view. */
function collectPromptRowsAnywhere(session: Session): number[] {
  return collectPromptRows(session, 1);
}

async function insertBatchesFrom(session: Session, startAnchorRow: number, lines: string[]): Promise<number> {
  const BATCH = 15;
  let screens = 0;
  let anchorRow = startAnchorRow;
  const remaining = [...lines];

  while (remaining.length > 0) {
    // Always probe for prompts already open before asking for more — a
    // brand-new member can come up with ~19 pre-supplied insert prompts
    // (tk5-edit-smoke.ts's measured shape) OR with none at all. Either way
    // this is what's actually on screen RIGHT NOW, never assumed.
    let prompts = collectPromptRows(session, anchorRow);

    if (prompts.length === 0) {
      // Try I<n> directly at anchorRow first — correct for a MID-FILE
      // insert (editorInsertBlock's anchor sits between two real lines;
      // REVEDIT reflows the following content down regardless of how much
      // blank screen space is currently visible, so a PF8 rescan finds
      // the new prompts wherever the repaint put them).
      const want = Math.min(remaining.length, BATCH);
      const prefix = prefixFieldAt(session, anchorRow);
      if (!prefix) {
        throw new Error(`no prefix field at row ${anchorRow} for I${want} — ${session.render({ mode: "full" })}`);
      }
      session.type({ at: prefix }, `I${want}`);
      await session.press("ENTER");
      screens++;
      prompts = collectPromptRows(session, anchorRow);

      let scrollTries = 0;
      while (prompts.length === 0 && scrollTries < 4) {
        await session.press("PF8");
        screens++;
        scrollTries++;
        prompts = collectPromptRowsAnywhere(session);
      }

      if (prompts.length === 0) {
        // Genuinely nothing to push down below anchorRow (it's the LAST
        // real line in the member, i.e. populateNewMember appending at
        // true EOF) — measured live: I<n> issued there opens prompts only
        // in whatever screen space remains below it (e.g. I15 with 2 rows
        // of headroom opened exactly 2, not 15; zero headroom opened
        // zero), because there is no following content for REVEDIT to
        // reflow. The reliable anchor for THIS case is the TOP/BOTTOM OF
        // DATA boundary row — inserting "before BOTTOM OF DATA" is the
        // standard ISPF Edit append idiom, and once found it always has
        // empty room below it (nothing else exists past that point).
        let boundaryRow = findBoundaryRow(session);
        let bScrolls = 0;
        while (boundaryRow === undefined && bScrolls < 6) {
          await session.press("PF8");
          screens++;
          bScrolls++;
          boundaryRow = findBoundaryRow(session);
        }
        if (boundaryRow !== undefined) {
          anchorRow = boundaryRow;
          const prefix2 = prefixFieldAt(session, anchorRow);
          if (!prefix2) {
            throw new Error(`no prefix field at boundary row ${anchorRow} for I — ${session.render({ mode: "full" })}`);
          }
          // A NUMERIC suffix on the boundary row's own prefix is rejected
          // outright — measured live, "REVEDIT INVALID ON THIS LINE" with
          // the typed "I15" left sitting unprocessed in the field. A bare
          // "I" (exactly one line) is what a regular content row's prefix
          // accepts too when nothing follows it to reflow, so use that
          // uniformly here; the loop's next iteration re-locates the
          // (now one row further down) boundary for the line after this.
          session.type({ at: prefix2 }, "I");
          await session.press("ENTER");
          screens++;
          prompts = collectPromptRowsAnywhere(session);
        }
      }
    }
    if (prompts.length === 0) {
      throw new Error(
        `no insert-prompt rows available after row ${anchorRow} — ${session.render({ mode: "compact" }).slice(0, 400)}`,
      );
    }

    const n = Math.min(prompts.length, remaining.length);
    for (let i = 0; i < n; i++) {
      session.type({ at: { row: prompts[i]!, col: 8 } }, remaining[i]!);
    }
    await session.press("ENTER");
    screens++;

    const typedNow = remaining.splice(0, n);
    if (remaining.length === 0) break;

    // Reposition to the last line just typed for the next batch's anchor.
    const lastText = typedNow[typedNow.length - 1]!;
    let row = findRowByText(session, lastText);
    let scrolls = 0;
    while (row === undefined && scrolls < 6) {
      await session.press("PF8");
      screens++;
      row = findRowByText(session, lastText);
      scrolls++;
    }
    if (row === undefined) {
      throw new Error(`could not relocate last inserted line for next batch: "${lastText}"`);
    }
    anchorRow = row;
  }
  return screens;
}

async function editorInsertBlock(session: Session, anchorSubstring: string, lines: string[]): Promise<number> {
  await editorFind(session, anchorSubstring);
  let screens = 1;
  const anchorRow = findRowByText(session, anchorSubstring);
  if (anchorRow === undefined) {
    throw new Error(
      `insert anchor not found after FIND: "${anchorSubstring}" — ${session.render({ mode: "compact" }).slice(0, 300)}`,
    );
  }
  screens += await insertBatchesFrom(session, anchorRow, lines);
  return screens;
}

/** Type `lines` into a brand-new (not-yet-existing) member's editor, which REVED just opened directly. */
async function populateNewMember(session: Session, lines: string[]): Promise<number> {
  // tk5-edit-smoke.ts's measured shape: row 1 = COMMAND/SCROLL, row 2 =
  // TOP OF DATA, rows 3.. = pre-supplied blank insert prompts.
  return insertBatchesFrom(session, 2, lines);
}

/** FIND `anchorSubstring`, then D<count> on the prefix at (found row + offsetRows). */
async function deleteLines(session: Session, anchorSubstring: string, count: number, offsetRows = 0): Promise<number> {
  let screens = 0;
  await editorFind(session, anchorSubstring);
  screens++;
  const foundRow = findRowByText(session, anchorSubstring);
  if (foundRow === undefined) {
    throw new Error(`delete anchor not found after FIND: "${anchorSubstring}"`);
  }
  const targetRow = foundRow + offsetRows;
  const prefix = prefixFieldAt(session, targetRow);
  if (!prefix)
    throw new Error(`no prefix field at row ${targetRow} for D${count} — ${session.render({ mode: "full" })}`);
  session.type({ at: prefix }, `D${count}`);
  await session.press("ENTER");
  screens++;
  await settle(session);
  return screens;
}

// ---- stages ----------------------------------------------------------------

/**
 * Create a brand-new PDS member by typing `lines` into REVEDIT, opened via
 * the direct `REVED 'dsn'` TSO command from READY. This is genuinely
 * FLAKY on this host — measured live, repeatedly: sometimes the freshly
 * opened member shows ~19 pre-supplied blank insert prompts exactly as
 * `tk5-edit-smoke.ts` documented (no "I" command needed for the first
 * lines), and sometimes it shows ZERO prompts with a
 * "****ZAP****AUTOSAVE**********" TOP/BOTTOM OF DATA line that then
 * refuses every insert command on it ("REVEDIT INVALID ON THIS LINE"),
 * with no scroll or wait fixing it. This was reproduced against the ISPF
 * ENTRY PANEL route (option 2, DATA SET NAME field) too, with and without
 * an extra settle before reading fields, a never-before-touched member
 * name, and a completely fresh logon right before opening — none of those
 * changed the outcome, so it isn't stale per-member or per-session state
 * this script can clear directly. What DOES work: retrying. A bounded
 * retry loop (DELETE, reopen, check) is the pragmatic fix for this
 * SETUP-only scaffolding (excluded from the operator total, so extra
 * attempts cost wall-clock, not measurement validity) — see Flags in the
 * final report.
 */
async function createMemberWithRetry(
  session: Session,
  user: string,
  password: string,
  dsn: string,
  lines: string[],
  maxAttempts = 6,
): Promise<number> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    enterCommand(session, `DELETE '${dsn}'`);
    await session.press("ENTER");
    await settle(session);

    enterCommand(session, `REVED '${dsn}'`);
    await session.press("ENTER");
    const opened = await pressThrough(session, /REVEDIT/i, 6);
    // "REVEDIT INVALID ON THIS LINE" (a leftover error banner from a
    // PRIOR attempt) matches /REVEDIT/i just as well as a genuine fresh
    // editor screen — check for that specifically, or a stuck attempt
    // looks "opened" every subsequent retry without ever really being one.
    const isStaleError = /INVALID|ERROR/i.test(session.render({ mode: "full" }));
    if (!opened || isStaleError) {
      lastErr = new Error(
        `REVED did not open ${dsn} cleanly (opened=${opened} staleError=${isStaleError}): ${session.render({ mode: "compact" }).slice(0, 300)}`,
      );
      log(`WARNING: createMemberWithRetry(${dsn}) attempt ${attempt}/${maxAttempts}: ${lastErr}`);
      await logoffFromReady(session).catch(() => {});
      await tsoLogon(session, user, password).catch(() => {});
      continue;
    }

    try {
      const screens = await populateNewMember(session, lines);

      session.type({ at: { row: 1, col: 14 } }, "SAVE");
      await session.press("ENTER");
      await settle(session);
      if (!/DATA SAVED/i.test(session.render({ mode: "full" }))) {
        throw new Error(`SAVE not acknowledged for ${dsn}: ${session.render({ mode: "compact" }).slice(0, 300)}`);
      }

      for (let i = 0; i < 6 && !/\bREADY\b/.test(session.render({ mode: "full" })); i++) {
        await session.press("PF3");
        await settle(session);
      }
      if (!/\bREADY\b/.test(session.render({ mode: "full" }))) {
        throw new Error(
          `did not unwind to READY after creating ${dsn}: ${session.render({ mode: "compact" }).slice(0, 300)}`,
        );
      }
      if (attempt > 1) log(`createMemberWithRetry(${dsn}): succeeded on attempt ${attempt}/${maxAttempts}`);
      return screens;
    } catch (err) {
      lastErr = err;
      log(
        `WARNING: createMemberWithRetry(${dsn}) attempt ${attempt}/${maxAttempts} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      // A bespoke CANCEL+PF3 recovery here left the error banner ON SCREEN
      // for the NEXT attempt too (measured live: `pressThrough(/REVEDIT/i)`
      // is satisfied by "REVEDIT INVALID ON THIS LINE" just as much as by
      // a genuine fresh editor screen, so 6/6 retries "opened" instantly
      // and reused the SAME stuck error state without ever really
      // reopening anything). `logoffFromReady()` is the hardened,
      // proven-live recovery (ENTER-before-PF3 on an error screen, CANCEL
      // fallback, PA1+CLEAR+LOGOFF last resort) — always use the full
      // reset between attempts, not a thinner one.
      await logoffFromReady(session).catch(() => {});
      await tsoLogon(session, user, password).catch(() => {});
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function readLinesNoTrailingBlank(filePath: string): string[] {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

async function setup(): Promise<{ note: string }> {
  const session = await connect({ host: HOST, port: PORT });
  let note = "";
  try {
    await tsoLogon(session, USER, PASS);

    const v0Lines = readLinesNoTrailingBlank(V0_CBL_PATH);
    const attempts1 = await createMemberWithRetry(session, USER, PASS, DSN_MEMBER, v0Lines);

    const jcl = fs.readFileSync(COMPSEND_JCL_PATH, "utf8");
    // Only the COPY.SYSUT1 source member changes — ENTRY/NAME stay
    // DOGESEND so the produced load module is byte-identical in shape to
    // the real one, per the brief.
    const jcl2 = jcl.replace(
      /(\/\/COPY\.SYSUT1\s+DD\s+DISP=SHR,DSN=HERC02\.DOGECICS\()DOGESEND(\))/,
      `$1${DSN_MEMBER_NAME}$2`,
    );
    if (jcl2 === jcl) {
      throw new Error("setup: COPY.SYSUT1 substitution did not match COMPSEND.jcl's format");
    }
    const jclLocal = path.join(CAPTURE_DIR, "COMPSNDZ.jcl");
    fs.writeFileSync(jclLocal, jcl2);
    const jclLines = jcl2.split(/\r?\n/).filter((l, idx, arr) => !(idx === arr.length - 1 && l === ""));
    const attempts2 = await createMemberWithRetry(session, USER, PASS, JCL_MEMBER, jclLines);

    note = `created ${DSN_MEMBER} (${v0Lines.length} lines, ${attempts1} screens) and ${JCL_MEMBER} (${jclLines.length} lines, ${attempts2} screens) via REVEDIT (IND$FILE PUT to a new member failed live — see Flags); logged off to a cold splash`;
    return { note };
  } finally {
    // MUST run on every exit path, success or throw — a bare session.close()
    // here leaves HERC02 logged on with the socket dropped, which strands
    // the userid IN USE (measured live, see the comment above).
    await logoffFromReady(session).catch((err) => log(`WARNING: setup logoff failed: ${err}`));
    session.close();
  }
}

async function openEditor(session: Session): Promise<{ note: string }> {
  enterCommand(session, `REVED '${DSN_MEMBER}'`);
  await session.press("ENTER");
  const ok = await pressThrough(session, /REVEDIT/i, 6);
  if (!ok) throw new Error(`REVED never reached the editor: ${session.render({ mode: "compact" }).slice(0, 300)}`);
  const skippedEntryPanel = !/ENTRY PANEL/i.test(session.render({ mode: "full" }));
  return { note: `opened ${DSN_MEMBER} directly (entry panel skipped=${skippedEntryPanel})` };
}

async function editStage(session: Session): Promise<{ note: string }> {
  let screens = 0;

  screens += await editorInsertBlock(session, "TEXT-CURRENCY", WS_BLOCK);
  screens += await deleteLines(session, "Amount:", 4);
  screens += await deleteLines(session, "PAYTOH", 26, -1);
  screens += await editorInsertBlock(session, "incase", PROC_BLOCK);

  session.type({ at: { row: 1, col: 14 } }, "SAVE");
  await session.press("ENTER");
  screens++;
  const saved = /DATA SAVED/i.test(session.render({ mode: "full" }));
  if (!saved) {
    throw new Error(`SAVE not acknowledged: ${session.render({ mode: "compact" }).slice(0, 300)}`);
  }

  for (let i = 0; i < 6 && !/\bREADY\b/.test(session.render({ mode: "full" })); i++) {
    await session.press("PF3");
    await settle(session);
    screens++;
  }
  if (!/\bREADY\b/.test(session.render({ mode: "full" }))) {
    throw new Error(`edit stage did not unwind to READY: ${session.render({ mode: "compact" }).slice(0, 300)}`);
  }

  const afterPath = path.join(CAPTURE_DIR, "DOGESNDZ.after.cbl");
  const got = await session.transfer({
    direction: "receive",
    hostFile: DSN_MEMBER,
    localFile: afterPath,
    mode: "ascii",
  });
  if (got.status !== "success") {
    throw new Error(`edit verify GET failed: ${got.code} ${got.hostMessage}`);
  }
  const gotLines = fs
    .readFileSync(afterPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+$/, ""));
  const wantLines = fs
    .readFileSync(V2_CBL_PATH, "utf8")
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+$/, ""));
  while (gotLines.length && gotLines[gotLines.length - 1] === "") gotLines.pop();
  while (wantLines.length && wantLines[wantLines.length - 1] === "") wantLines.pop();
  let mismatchAt = -1;
  const maxLen = Math.max(gotLines.length, wantLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (gotLines[i] !== wantLines[i]) {
      mismatchAt = i;
      break;
    }
  }
  const verify =
    mismatchAt === -1
      ? "PASS"
      : `FAIL@line${mismatchAt + 1} got=${JSON.stringify(gotLines[mismatchAt] ?? "<eof>")} want=${JSON.stringify(wantLines[mismatchAt] ?? "<eof>")}`;
  if (mismatchAt !== -1) {
    console.error(`EDIT VERIFY FAIL: ${verify}`);
  }

  const allTyped = [...WS_BLOCK, ...PROC_BLOCK];
  const chars = allTyped.reduce((s, l) => s + l.length, 0);
  const charsNoIndent = allTyped.reduce((s, l) => s + l.trim().length, 0);
  return {
    note: `screens=${screens} linesTyped=${allTyped.length} chars=${chars} charsNoIndent=${charsNoIndent} verify=${verify}`,
  };
}

let compileJobId = "";

async function compileWait(session: Session): Promise<{ note: string }> {
  enterCommand(session, `SUBMIT '${JCL_MEMBER}'`);
  await session.press("ENTER");
  await settle(session);
  const submitScreen = session.render({ mode: "full" });
  const m = /JOB\s+DOGECOB\((\w+)\)\s+SUBMITTED/i.exec(submitScreen);
  if (!m) throw new Error(`SUBMIT did not report a jobid: ${submitScreen.slice(-400)}`);
  compileJobId = m[1]!;

  let onQueue = false;
  let polls = 0;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    enterCommand(session, `STATUS DOGECOB(${compileJobId})`);
    await session.press("ENTER");
    await settle(session);
    polls++;
    if (/ON OUTPUT QUEUE/i.test(session.render({ mode: "full" }))) {
      onQueue = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!onQueue) throw new Error(`job ${compileJobId} never reached ON OUTPUT QUEUE after ${polls} polls`);
  return { note: `jobid=${compileJobId} polls=${polls}` };
}

async function readListing(session: Session): Promise<{ note: string }> {
  enterCommand(session, `OUTPUT DOGECOB(${compileJobId})`);
  await session.press("ENTER");
  let screensRead = 0;
  let full = "";
  const maxScreens = 500;
  while (screensRead < maxScreens) {
    await settle(session, 800, 8000);
    const t = session.render({ mode: "full" });
    full += `${t}\n`;
    screensRead++;
    if (/\*\*\*/.test(t)) {
      await session.press("ENTER");
      continue;
    }
    break;
  }
  const readyReached = /\bREADY/.test(session.render({ mode: "full" }));
  const condCodes = [...full.matchAll(/COND CODE\s+(\d{4})/gi)].map((mm) => mm[1]);
  const hasIkf = /IKF\d+/i.test(full);
  return {
    note: `screens=${screensRead} readyReached=${readyReached} condCodes=${condCodes.join(",") || "none"} ikfDiagnostics=${hasIkf}`,
  };
}

async function restartKicks(session: Session): Promise<{ note: string }> {
  enterCommand(session, "EXEC 'HERC02.KICKSSYS.V1R5M0.CLIST(KICKS)' 'SIT(DO)'");
  await session.press("ENTER");
  if (!(await pressThrough(session, /KSGM for tso user/i, 10))) {
    throw new Error(`KICKS never painted the KSGM banner: ${session.render({ mode: "compact" }).slice(0, 300)}`);
  }
  await session.press("CLEAR");
  await session.press("CLEAR");
  session.typeRaw("DOGE");
  await session.press("ENTER");
  if (!(await pressThrough(session, /MUCH COIN|PRESS F5 TO CONTINUE/i, 6))) {
    throw new Error(`DOGE splash never painted: ${session.render({ mode: "compact" }).slice(0, 300)}`);
  }
  await session.press("PF5");
  if (!(await pressThrough(session, /Available/i, 6))) {
    throw new Error(`DOGE main menu never painted: ${session.render({ mode: "compact" }).slice(0, 300)}`);
  }
  return { note: "KICKS SIT(DO) started, DOGE main menu reached" };
}

interface ManualTest {
  amount: string;
  expectSubstring: string;
}

const MANUAL_TESTS: ManualTest[] = [
  { amount: "10001", expectSubstring: "DAILY LIMIT" },
  { amount: "100", expectSubstring: "SENDING" },
  { amount: "999.5", expectSubstring: "SENDING" },
  { amount: "9000", expectSubstring: "DAILY LIMIT" },
];

async function manualTests(session: Session): Promise<{ note: string }> {
  session.type({ after: "Option:" }, "S");
  await session.press("ENTER");
  if (!(await pressThrough(session, /pay\s*to/i, 4))) {
    throw new Error(`send form never painted: ${session.render({ mode: "compact" }).slice(0, 300)}`);
  }

  for (let i = 0; i < MANUAL_TESTS.length; i++) {
    const test = MANUAL_TESTS[i]!;
    const t0 = Date.now();
    if (i === 0) session.type({ after: "to" }, TO_ADDRESS);
    session.type({ after: "amount" }, test.amount);
    await session.press("ENTER");
    await settle(session);
    const message = rowText(session, 17).slice(19, 61).trim();
    const matched = message.includes(test.expectSubstring);
    appendStamp({
      stage: `manual-test-${i + 1}`,
      t: Number(((Date.now() - t0) / 1000).toFixed(3)),
      epochMs: Date.now(),
      note: `amount=${test.amount} message="${message}" expectedSubstring="${test.expectSubstring}" matched=${matched}`,
    });
  }
  return { note: "reached DSND send form, ran four hand tests (see manual-test-N stamps)" };
}

async function universalTeardown(session: Session): Promise<{ note: string }> {
  try {
    for (let round = 0; round < 3 && !/\bREADY\b/.test(session.render({ mode: "full" })); round++) {
      const text = session.render({ mode: "full" });
      if (/ENTRY PANEL|REVEDIT|primary option menu/i.test(text)) {
        for (
          let i = 0;
          i < 12 &&
          !/primary option menu/i.test(session.render({ mode: "full" })) &&
          !/\bREADY\b/.test(session.render({ mode: "full" }));
          i++
        ) {
          // An editor line-command error ("INVALID ON THIS LINE") can eat
          // a bare PF3 without exiting (measured live: 8 PF3 presses never
          // got past it) — ENTER first to dismiss/acknowledge whatever the
          // command line is currently holding, then PF3.
          if (/INVALID|ERROR/i.test(session.render({ mode: "full" }))) {
            await session.press("ENTER");
            await settle(session);
          }
          await session.press("PF3");
          await settle(session);
        }
        if (
          !/primary option menu/i.test(session.render({ mode: "full" })) &&
          !/\bREADY\b/.test(session.render({ mode: "full" }))
        ) {
          // Still stuck — CANCEL is the common ISPF Edit escape that
          // abandons whatever the editor is doing and exits regardless of
          // an unresolved line-command error.
          session.type({ at: { row: 1, col: 14 } }, "CANCEL");
          await session.press("ENTER");
          await settle(session, 800, 8000);
          for (
            let i = 0;
            i < 6 &&
            !/primary option menu/i.test(session.render({ mode: "full" })) &&
            !/\bREADY\b/.test(session.render({ mode: "full" }));
            i++
          ) {
            await session.press("PF3");
            await settle(session);
          }
        }
        if (/primary option menu/i.test(session.render({ mode: "full" }))) {
          enterCommand(session, "END");
          await session.press("ENTER");
          await settle(session, 800, 8000);
        }
      } else if (!/\bREADY\b/.test(text)) {
        // Assume KICKS/DOGE territory (including the blank transaction-entry
        // screen, which has zero fields and renders no recognizable text).
        for (let i = 0; i < 4 && !/DOGE HAS EXITED/i.test(session.render({ mode: "full" })); i++) {
          await session.press("PF3");
          await settle(session);
        }
        await session.press("CLEAR");
        await settle(session);
        await session.press("CLEAR");
        await settle(session);
        session.typeRaw("KSSF");
        await session.press("ENTER");
        await pressThrough(session, /\bREADY\b/i, 6);
      }
    }

    if (/\bREADY\b/.test(session.render({ mode: "full" }))) {
      enterCommand(session, "LOGOFF");
      await session.press("ENTER");
      await pressThrough(session, /Logon\s*===>|Terminal\s+CUU/i, 5);
      return { note: "reached READY and logged off cleanly to the splash" };
    }
    const recovered = await lastResortLogoff(session).catch(() => false);
    if (recovered) {
      return { note: "recovered via PA1+CLEAR+LOGOFF last resort" };
    }
    log("WARNING: cleanup never reached READY — HERC02 may be stranded IN USE");
    log(`=== FINAL SCREEN === ${session.render({ mode: "compact" }).slice(0, 400)}`);
    return { note: "WARNING: cleanup did not reach READY before giving up" };
  } catch (err) {
    log(`WARNING: cleanup crashed, trying the PA1+CLEAR+LOGOFF last resort: ${err}`);
    const recovered = await lastResortLogoff(session).catch(() => false);
    if (recovered) {
      return {
        note: `cleanup crashed (${err instanceof Error ? err.message : String(err)}) but PA1+CLEAR+LOGOFF recovered`,
      };
    }
    log(`WARNING: cleanup crashed — HERC02 may be stranded IN USE: ${err}`);
    return { note: `WARNING: cleanup crashed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---- main -------------------------------------------------------------

async function main(): Promise<void> {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
  fs.writeFileSync(TIMINGS_PATH, "");

  await stage("setup", setup);

  const session = await connect({ host: HOST, port: PORT });
  let failed = false;
  try {
    await stage("logon", () => tsoLogon(session, USER, PASS).then(() => ({ note: "reached TSO READY" })));
    await stage("open-editor", () => openEditor(session));
    await stage("edit", () => editStage(session));
    await stage("compile-wait", () => compileWait(session));
    await stage("read-listing", () => readListing(session));
    await stage("restart-kicks", () => restartKicks(session));
    await stage("manual-tests", () => manualTests(session));
  } catch (err) {
    failed = true;
    log(`SCENARIO CRASHED: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  } finally {
    await stage("logoff", () => universalTeardown(session));
    session.close();
  }

  log(failed ? "OVERALL: FAIL (scenario threw — see stamp notes and log above)" : "OVERALL: PASS");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
