/**
 * The agent-loop side of the measured-vs-manual comparison: derives every
 * number straight from CAPTURES.timings (captures/run1/timings.jsonl), never
 * hand-typed. CompareScene's bar chart and the process step's right-hand
 * callout both import this — one arithmetic path, so a re-capture moves
 * both without anyone editing two places in sync.
 */
import { CAPTURES } from "../../generated/dogecics/captures";

export type Group = "tests" | "search+plan" | "edit" | "upload+compile" | "test again";

export const GROUP_ORDER: Group[] = ["tests", "search+plan", "edit", "upload+compile", "test again"];

export const GROUP_COLOR: Record<Group, string> = {
  tests: "#58a6ff",
  "search+plan": "#d29922",
  edit: "#bc8cff",
  "upload+compile": "#3fb950",
  "test again": "#f778ba",
};

export const STAGE_GROUP: Record<string, Group> = {
  "tests-regression-written": "tests",
  "tests-regression-run": "tests",
  "tests-limit-written": "tests",
  "tests-limit-run": "tests",
  search: "search+plan",
  plan: "search+plan",
  "edit-v1": "edit",
  "jcl-written": "edit",
  "edit-v2": "edit",
  "host-logon": "upload+compile",
  upload: "upload+compile",
  submit: "upload+compile",
  "job-done": "upload+compile",
  "job-output": "upload+compile",
  "submit-2": "upload+compile",
  "job-done-2": "upload+compile",
  "job-output-2": "upload+compile",
  "host-logoff": "upload+compile",
  "tests-run-3": "test again",
};

/** The regression suite pre-existed (steps.ts's warm-up "what tests do we
 * have?" exchange) — the agent's OWN loop, the thing this demo measures,
 * starts once that's confirmed green, not from the capture's absolute
 * "start". Moving this one constant moves the TimerHud's per-step jumps,
 * this module's own total, and CompareScene's bar together. */
export const LOOP_START_STAGE = "tests-regression-run";

/** The agent loop ends when the suite went green (tests-run-3) — the two
 * later timestamps, atm-after-50000 and atm-after-0.5, are the DEMO's own
 * after-check of the ATM (recording the before/after 3270 captures), not
 * agent loop time, so they're excluded from both the total and the
 * per-stage breakdown below. */
export const LOOP_END_STAGE = "tests-run-3";

export function measuredGroupsMs(): Array<{ group: Group; ms: number }> {
  const sums = new Map<Group, number>();
  const rows = CAPTURES.timings;
  const startIndex = rows.findIndex((r) => r.stage === LOOP_START_STAGE);
  const endIndex = rows.findIndex((r) => r.stage === LOOP_END_STAGE);
  const first = startIndex === -1 ? 1 : startIndex + 1;
  const last = endIndex === -1 ? rows.length - 1 : endIndex;
  for (let i = first; i <= last; i++) {
    const stage = rows[i]!.stage;
    const group = STAGE_GROUP[stage];
    if (!group) continue;
    const delta = rows[i]!.epochMs - rows[i - 1]!.epochMs;
    sums.set(group, (sums.get(group) ?? 0) + delta);
  }
  return GROUP_ORDER.filter((g) => sums.has(g)).map((g) => ({ group: g, ms: sums.get(g)! }));
}

/** epoch-ms elapsed since LOOP_START_STAGE — what the TimerHud jumps to on every VS Code step from the change-prompt on. Negative before LOOP_START_STAGE (nothing in this story calls it that early). */
export function msSinceLoopStart(stage: string): number {
  const rows = CAPTURES.timings;
  const startRow = rows.find((r) => r.stage === LOOP_START_STAGE);
  const row = rows.find((r) => r.stage === stage);
  if (!startRow || !row) return 0;
  return row.epochMs - startRow.epochMs;
}

/** Total measured agent-loop time (start -> LOOP_END_STAGE), ms — the single number every "9:23"-style display quotes. */
export function agentLoopTotalMs(): number {
  return measuredGroupsMs().reduce((sum, g) => sum + g.ms, 0);
}

/** Total time in the stamps after the loop ended (the ATM after-check) — shown as a note, counted on neither side. */
export function afterCheckMs(): number {
  const rows = CAPTURES.timings;
  const endIndex = rows.findIndex((r) => r.stage === LOOP_END_STAGE);
  if (endIndex === -1) return 0;
  const last = rows[rows.length - 1]!;
  const end = rows[endIndex]!;
  return last.epochMs - end.epochMs;
}
