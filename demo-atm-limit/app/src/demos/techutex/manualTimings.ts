/**
 * The manual-baseline side of CompareScene, adapted from DOGECICS's own
 * model (../dogecics/manualTimings.ts) to the Endevor Quick-Edit path
 * instead of ISPF/REVEDIT, with the SAME three textures: mechanics, typing
 * (character count at a stated rate), thinking — never blended into one
 * number. UNLIKE DOGECICS, NOTHING here was timed with a stopwatch
 * (FACTS.md: "No manual-mechanics timing baseline… nobody was timed doing
 * this change by hand in this run") — every stage's own `basis` says
 * "estimate", not "measured". The two typing counts are the exception:
 * real character counts off the real captured diff/test file
 * (CAPTURES.v2DiffAddedChars/dailyLimitTestChars, computed at prerender
 * time — see scripts/prerender.mts's countDiffAddedChars).
 */
import { CAPTURES } from "../../generated/techutex/captures";
import { splitClockMs } from "../../kit/engine/duration";

export const TYPING_CHARS_PER_MIN = 150; // stated on the slide — same rate DOGECICS quotes, for comparability

export interface ManualStage {
  stage: string;
  mechanicsSec: number | null;
  typingChars: number;
  thinkingMin: number;
  basis: string;
}

const ESTIMATE = "estimate — no manual-mechanics baseline was timed for this ticket (FACTS.md)";

export const MANUAL_HAND_TESTED: ManualStage[] = [
  {
    // Owner's review round 3: relabeled "Search for sources" on the process
    // diagram (steps.ts) — finding the right elements in Endevor (and their
    // dependencies) is the real first step, not just opening one already-
    // known member. mechanicsSec dropped to 0: the owner's 15 min IS the
    // estimate for this whole stage, not on top of a separate open-time.
    stage: "Search for sources in Endevor",
    mechanicsSec: 0,
    typingChars: 0,
    thinkingMin: 15,
    basis: "owner's estimate: finding the right elements and their dependencies in Endevor",
  },
  {
    stage: "Read the ticket, DOT500 (1,546 lines) and DOT400's pattern",
    mechanicsSec: 60,
    typingChars: 0,
    thinkingMin: 20,
    basis: ESTIMATE,
  },
  {
    // Its own stage (not folded into the reading above), so the process
    // diagram's "Design" node can carry its own number — same shape as
    // DOGECICS's own "Decide the design" stage.
    stage: "Decide the design",
    mechanicsSec: 0,
    typingChars: 0,
    thinkingMin: 30,
    basis: ESTIMATE,
  },
  {
    stage: "Write the change (3 edits, 55 added lines)",
    mechanicsSec: 90,
    // Real character count from the real captured DOT500.v2.diff — see this
    // file's header comment.
    typingChars: CAPTURES.v2DiffAddedChars,
    thinkingMin: 30,
    basis: `mechanics and thinking: ${ESTIMATE}; characters: measured from the real DOT500.v2.diff`,
  },
  {
    stage: "Update + generate, page the listing (round 1) — RC 12",
    mechanicsSec: 60,
    typingChars: 0,
    thinkingMin: 15,
    basis: ESTIMATE,
  },
  {
    stage: "Fix + regenerate (round 2) — RC 12 again",
    mechanicsSec: 45,
    typingChars: 0,
    thinkingMin: 10,
    basis: ESTIMATE,
  },
  {
    stage: "Fix + regenerate (round 3) — RC 0",
    mechanicsSec: 45,
    typingChars: 0,
    thinkingMin: 5,
    basis: ESTIMATE,
  },
  {
    stage: "Deploy (CEMT SET PROG(DOT500) PHASEIN)",
    mechanicsSec: 30,
    typingChars: 0,
    thinkingMin: 0,
    basis: ESTIMATE,
  },
  {
    stage: "Test by hand at DOT5",
    mechanicsSec: 60,
    typingChars: 0,
    thinkingMin: 10,
    basis: ESTIMATE,
  },
];

export const MANUAL_WITH_TESTS: ManualStage[] = [
  ...MANUAL_HAND_TESTED,
  {
    stage: "Write the HB.js daily-limit test",
    mechanicsSec: 30,
    // Real character count from the real captured dot.dailyLimit.test.js.
    typingChars: CAPTURES.dailyLimitTestChars,
    thinkingMin: 15,
    basis: `mechanics and thinking: ${ESTIMATE}; characters: measured from the shipped dot.dailyLimit.test.js`,
  },
];

// ---- shared math — identical shape to ../dogecics/manualTimings.ts, kept
// as this demo's own copy rather than a cross-demo import (each demo owns
// its own data end to end). ----

export interface KindMinutes {
  mechanics: number;
  typing: number;
  thinking: number;
}

export function stageTypingMin(s: ManualStage): number {
  return s.typingChars / TYPING_CHARS_PER_MIN;
}

export function sumKinds(stages: ManualStage[]): KindMinutes {
  return stages.reduce(
    (acc, s) => ({
      mechanics: acc.mechanics + (s.mechanicsSec ?? 0) / 60,
      typing: acc.typing + stageTypingMin(s),
      thinking: acc.thinking + s.thinkingMin,
    }),
    { mechanics: 0, typing: 0, thinking: 0 },
  );
}

export function kindTotal(k: KindMinutes): number {
  return k.mechanics + k.typing + k.thinking;
}

export function formatMinSec(totalMin: number): string {
  const { minutes, seconds } = splitClockMs(totalMin * 60000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatHM(totalMin: number): string {
  const rounded = Math.round(totalMin);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatHalfHour(totalMin: number): string {
  const rounded = Math.round(totalMin / 30) * 30;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

const ROUND_SCALE_BASE = [1, 5, 10, 15, 30, 45, 60, 90, 120];

export function formatHumanRounded(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  const scale = [...ROUND_SCALE_BASE];
  while (scale[scale.length - 1]! < minutes) {
    scale.push(scale[scale.length - 1]! + 30);
  }
  let best = scale[0]!;
  let bestRatio = Infinity;
  for (const candidate of scale) {
    const ratio = minutes >= candidate ? minutes / candidate : candidate / minutes;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }
  if (best < 60) return `${best} min`;
  const h = Math.floor(best / 60);
  const m = best % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}
