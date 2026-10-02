/**
 * The manual-baseline side of CompareScene: two deliverables (the fix
 * alone, and the fix plus the four new Panelwright tests), each broken into
 * stages, each stage broken into three MEASURED-DIFFERENTLY kinds of time —
 * mechanics (a stopwatch), typing (character count at a stated rate) and
 * thinking (an estimate) — never blended into one number.
 *
 * Mechanics measured on tk5probe 2026-09-25 (captures/manual1/mechanics.jsonl);
 * typing at the stated rate; thinking is an estimate for a practiced
 * COBOL/CICS developer who knows DOGECICS.
 */
import { splitClockMs } from "../../kit/engine/duration";

export const TYPING_CHARS_PER_MIN = 150; // stated on the slide

export interface ManualStage {
  stage: string;
  mechanicsSec: number | null;
  typingChars: number;
  thinkingMin: number;
  basis: string;
}

export const MANUAL_HAND_TESTED: ManualStage[] = [
  {
    stage: "Logon, open the member in REVEDIT",
    mechanicsSec: 10,
    typingChars: 0,
    thinkingMin: 0,
    basis: "measured: logon to READY 5.5 s, REVED to the editor 2.7 s",
  },
  {
    stage: "Read the ticket, DOGESEND and DOGEMAIN",
    mechanicsSec: 15,
    typingChars: 0,
    thinkingMin: 10,
    basis: "paging the 275-line member measured 13.6 s (15 screens); reading ~400 lines of COBOL estimated",
  },
  {
    // Its own stage (not folded into the reading above) so the process
    // diagram's "Design" node can carry its own number (the owner's
    // estimate for this ticket).
    stage: "Decide the design",
    mechanicsSec: 0,
    typingChars: 0,
    thinkingMin: 30,
    basis: "design time estimated (tracker record, date handling, amount parsing in a 1974 COBOL)",
  },
  {
    stage: "Write the change (142 lines)",
    mechanicsSec: 50,
    typingChars: 4419,
    thinkingMin: 30,
    basis:
      "characters measured from the diff; editor round trips (insert batches, SAVE, exit 13.7 s) measured; thinking estimated",
  },
  {
    stage: "Submit, compile, read the RC 12 listing",
    mechanicsSec: 190,
    typingChars: 0,
    thinkingMin: 20,
    basis:
      "submit to ON OUTPUT QUEUE 8.3 s measured; the listing is 89 terminal screens (measured) at 2 s per ENTER-and-skim; understanding the compiler limit estimated",
  },
  {
    stage: "Rewrite the parsing (v2), recompile, read the listing",
    mechanicsSec: 240,
    typingChars: 1600,
    thinkingMin: 0,
    basis:
      "49 lines / 1,600 chars measured from the v1→v2 diff; same editor and listing mechanics as above; thinking counted in stage 4",
  },
  {
    stage: "Restart KICKS, run the four cases by hand",
    mechanicsSec: 90,
    typingChars: 0,
    thinkingMin: 10,
    basis:
      "KICKS lifecycle 25 s measured; four sends at the DSND screen ~15 s each; test plan and reading results estimated",
  },
];

export const MANUAL_WITH_TESTS: ManualStage[] = [
  ...MANUAL_HAND_TESTED,
  {
    // The regression suite now pre-exists (the agent loop's own timing
    // starts after confirming it, agentLoopTiming.ts's LOOP_START_STAGE) —
    // the manual comparison's "same deliverable, with tests" side only
    // has to account for the FOUR NEW limit tests, not all eight.
    stage: "Write the four limit tests",
    mechanicsSec: 60,
    typingChars: 1364, // measured size of test/atm.limit.test.ts
    thinkingMin: 20,
    basis: "characters measured from the shipped test/atm.limit.test.ts; thinking estimated",
  },
];

// ---- shared math: every consumer (CompareScene, the process step's manual
// diagram) imports these instead of re-deriving totals from ManualStage[],
// so a stage edited here moves every number that quotes it. ----

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

// Shares duration.ts's floor with TimerHud's live clock — see that file's
// header comment for why this used to disagree with it (08:11 vs 8:12).
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

/**
 * The process step's left-diagram headline rounds to the nearest HALF
 * HOUR, not the nearest minute (formatHM above) — a precise "2h 20m" reads
 * as a measurement the audience could interrogate, where this slide wants
 * a round, defensible "about how long", spelled out ("2 h 30 min"/"3 h")
 * rather than compact ("2h 30m") to read as prose next to the sentence
 * around it.
 */
export function formatHalfHour(totalMin: number): string {
  const rounded = Math.round(totalMin / 30) * 30;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** The coarse "1 / 5 / 10 / 15 / 30 / 45 min" scale formatHumanRounded snaps to below an hour; above it, multiples of 30. */
const ROUND_SCALE_BASE = [1, 5, 10, 15, 30, 45, 60, 90, 120];

/**
 * A deliberately COARSE rounding for the process diagram's node/loop
 * labels — the big total and the comparison slide keep the precise
 * figures (formatHM/formatMinSec above); this is only for "about how
 * long", read at a glance. Snaps to the nearest step on a 1/5/10/15/30/
 * 45/60/90/120/… scale (multiples of 30 above 60), "nearest" measured by
 * RATIO rather than raw minutes: 2.97 min reads as "5 min" to a person
 * (ratio 5/2.97 ≈ 1.69) even though 1 is numerically closer in minutes
 * (2.97 - 1 = 1.97 < 5 - 2.97 = 2.03) — absolute distance would silently
 * round a "page the listing" estimate down to a number smaller than the
 * measured "8 s, submit" step right next to it, which reads as a mistake.
 */
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
