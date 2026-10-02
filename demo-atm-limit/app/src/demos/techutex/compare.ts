/**
 * Builds the compare step's `CompareData` (kit/engine/content.ts) — every
 * number computed here, ONCE, from manualTimings.ts/agentLoopTiming.ts;
 * kit/diagrams/CompareScene.tsx only draws what this returns.
 */
import { MANUAL_HAND_TESTED, MANUAL_WITH_TESTS, sumKinds, TYPING_CHARS_PER_MIN } from "./manualTimings";
import { GROUP_COLOR, measuredGroupsMs } from "./agentLoopTiming";
import { roundedRatio } from "../../kit/engine/compareMath";
import type { CompareData } from "../../kit/engine/content";

export function buildCompareData(): CompareData {
  return {
    title: "Agent loop vs. manual",
    agent: {
      groups: measuredGroupsMs().map((g) => ({ group: g.group, ms: g.ms, color: GROUP_COLOR[g.group] })),
      // No after-the-loop check to exclude here — unlike DOGECICS's ATM
      // after-check, this run's last timed stage IS the story's last step.
      afterCheckMs: 0,
      afterCheckLabel: "",
    },
    manual: [
      { title: "Manual, hand-tested", kinds: sumKinds(MANUAL_HAND_TESTED) },
      { title: "Manual, same deliverable (with the HB.js test)", kinds: sumKinds(MANUAL_WITH_TESTS) },
    ],
    typingRateLabel: `${TYPING_CHARS_PER_MIN} chars/min`,
    // Nothing on the manual side was stopwatch-timed for this app (manualTimings.ts header).
    mechanicsBasis: "estimate",
    ratioLabel: "manual, with tests — vs. agent",
    // verbatim (owner, review round 8 — text edit).
    takeaway:
      "Endevor MCP + Zowe MCP + HB.js MCP give the agent the same path a developer has — plan, edit, compile, deploy, and test.",
  };
}

/** The compare slide's own headline ratio (kit's compareMath.ts) — the title step imports THIS, never a typed-in number, so the two slides can never disagree. */
export const TECHUTEX_RATIO = roundedRatio(buildCompareData());
