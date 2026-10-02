/**
 * Builds the compare step's `CompareData` (kit/engine/content.ts) —
 * every number computed here, ONCE, from manualTimings.ts/agentLoopTiming
 * .ts; kit/diagrams/CompareScene.tsx only draws what this returns. The
 * process step's own manual/agent callouts (steps.ts) import the SAME
 * underlying functions, so a re-capture moves every quoted number together.
 */
import { MANUAL_HAND_TESTED, MANUAL_WITH_TESTS, sumKinds, TYPING_CHARS_PER_MIN } from "./manualTimings";
import { GROUP_COLOR, measuredGroupsMs, afterCheckMs } from "./agentLoopTiming";
import type { CompareData } from "../../kit/engine/content";

export function buildCompareData(): CompareData {
  return {
    title: "Agent loop vs. manual",
    agent: {
      groups: measuredGroupsMs().map((g) => ({ group: g.group, ms: g.ms, color: GROUP_COLOR[g.group] })),
      afterCheckMs: afterCheckMs(),
      afterCheckLabel: "ATM after-check",
    },
    manual: [
      { title: "Manual, hand-tested", kinds: sumKinds(MANUAL_HAND_TESTED) },
      { title: "Manual, same deliverable (with tests)", kinds: sumKinds(MANUAL_WITH_TESTS) },
    ],
    typingRateLabel: `${TYPING_CHARS_PER_MIN} chars/min`,
    // Stopwatch-timed on the real host (manualTimings.ts header).
    mechanicsBasis: "measured",
    ratioLabel: "manual, with tests — vs. agent",
    takeaway: "Giving the AI agent the same tools that developers have enables it to deliver fully tested code.",
  };
}
