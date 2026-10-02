/**
 * The agent-loop side of the measured-vs-manual comparison: derives every
 * number straight from CAPTURES.timings (captures/run1/session/timings-from-transcript.jsonl),
 * never hand-typed. CompareScene's bar chart and the process step's
 * right-hand callout both import this.
 *
 * REPLACED 2026-09-25 (second pass): the real session transcript
 * (session/claude-session.jsonl, delivered ~19:44 UTC) supersedes this
 * file's original, coarser per-tool-family stamps with per-CALL stamps —
 * second-resolution and, unlike the original capture, already in real
 * chronological order (no sort-by-epoch workaround needed; kept anyway as
 * a defensive measure, since nothing here should assume file order is
 * timestamp order). LOOP_START_STAGE is now "tests-regression-run" (the
 * regression check's real RERUN once the tests' own signature bug was
 * fixed) rather than the session's absolute start — the warm-up activity
 * before it (get_map/get_elements, hb script list, the two smoke calls,
 * writing and then FIXING the tests) is real and shown, but excluded from
 * the measured total the same way DOGECICS excludes its own pre-loop
 * warm-up.
 */
import { CAPTURES, type TimingRow } from "../../generated/techutex/captures";

export type Group = "tests" | "read" | "edit" | "build" | "fix" | "deploy";

export const GROUP_ORDER: Group[] = ["tests", "read", "edit", "build", "fix", "deploy"];

export const GROUP_COLOR: Record<Group, string> = {
  tests: "#58a6ff",
  read: "#d29922",
  edit: "#bc8cff",
  build: "#79c0ff",
  fix: "#f778ba",
  deploy: "#3fb950",
};

/**
 * Which group a stage's OWN elapsed time (since the previous stage) is
 * attributed to. "build" is the two FAILED generate+listing rounds (round
 * 1 outright, round 2's generate+listing); "fix" is every edit that
 * responded to a failure (v2, v3) PLUS round 3's own generate+listing,
 * since that's the fix actually landing. "tests" covers both the
 * regression re-run/new-test-red confirmation AND the closing green run.
 * Every stage BEFORE "tests-regression-run" (the real warm-up: Endevor
 * metadata reads, hb smoke calls, writing then fixing the two test files)
 * has no group here on purpose — it's real activity, shown in the warm-up
 * steps, but outside the measured loop (see LOOP_START_STAGE below).
 */
export const STAGE_GROUP: Record<string, Group> = {
  "tests-regression-run": "tests",
  "tests-new-run": "tests",
  "read-sources": "read",
  "edit-v1": "edit",
  "generate-1": "build",
  "listing-1": "build",
  "generate-2": "build",
  "listing-2": "build",
  "edit-v2": "fix",
  "edit-v3": "fix",
  "generate-3": "fix",
  "listing-3": "fix",
  deploy: "deploy",
  "tests-run-green": "tests",
};

/** The regression check's real, fixed rerun — the loop's own zero point (session/timings-from-transcript.jsonl's "tests-regression-run", 16:40:58Z). Everything before it (metadata reads, hb smoke calls, writing AND fixing the two test files) is real but excluded, same device DOGECICS uses for its own warm-up session. */
export const LOOP_START_STAGE = "tests-regression-run";
export const LOOP_END_STAGE = "tests-run-green";

function sortedRows(): TimingRow[] {
  return [...CAPTURES.timings].sort((a, b) => a.epochMs - b.epochMs);
}

export function measuredGroupsMs(): Array<{ group: Group; ms: number }> {
  const rows = sortedRows();
  const sums = new Map<Group, number>();
  const startIndex = rows.findIndex((r) => r.stage === LOOP_START_STAGE);
  const endIndex = rows.findIndex((r) => r.stage === LOOP_END_STAGE);
  // Bounded to [startIndex+1, endIndex] — NOT "from row 1", which would also
  // sum the delta INTO LOOP_START_STAGE from whatever real warm-up row
  // precedes it (a 12s "tests-new-fixed -> tests-regression-run" gap this
  // once double-counted, inflating the measured total past the real 10:14).
  const first = startIndex === -1 ? 1 : startIndex + 1;
  const last = endIndex === -1 ? rows.length - 1 : endIndex;
  for (let i = first; i <= last; i++) {
    const stage = rows[i]!.stage;
    const group = STAGE_GROUP[stage];
    if (!group) continue;
    const delta = Math.max(0, rows[i]!.epochMs - rows[i - 1]!.epochMs);
    sums.set(group, (sums.get(group) ?? 0) + delta);
  }
  return GROUP_ORDER.filter((g) => sums.has(g)).map((g) => ({ group: g, ms: sums.get(g)! }));
}

/** epoch-ms elapsed since LOOP_START_STAGE for a named stage — what the TimerHud jumps to on every VS Code step. Looks the stage up by its OWN epochMs (never by file position). Negative before LOOP_START_STAGE (the warm-up steps never call this). */
export function msSinceLoopStart(stage: string): number {
  const startRow = CAPTURES.timings.find((r) => r.stage === LOOP_START_STAGE);
  const row = CAPTURES.timings.find((r) => r.stage === stage);
  if (!startRow || !row) return 0;
  return row.epochMs - startRow.epochMs;
}

/** Duration between two named stages, in ms — undefined (never negative) if the two stages' real epochMs values disagree with the argument order. */
export function durationBetween(fromStage: string, toStage: string): number | undefined {
  const from = CAPTURES.timings.find((r) => r.stage === fromStage);
  const to = CAPTURES.timings.find((r) => r.stage === toStage);
  if (!from || !to) return undefined;
  const delta = to.epochMs - from.epochMs;
  return delta > 0 ? delta : undefined;
}

export function agentLoopTotalMs(): number {
  return measuredGroupsMs().reduce((sum, g) => sum + g.ms, 0);
}
