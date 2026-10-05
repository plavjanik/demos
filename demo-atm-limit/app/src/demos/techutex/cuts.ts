/**
 * The three cuts of the Techutex story: Full (every step, `STEPS` itself),
 * Medium and Short. A cut is only a selection and ordering of step data:
 * a step kept as-is is the SAME object from `STEPS` (so `#step-<id>` deep
 * links and review notes carry over), and a merged step is a spread of its
 * source steps with a new id.
 *
 * Narration rule (pinned by cuts.test.ts): a merged step's narration is
 * composed ONLY by concatenating whole paragraphs that already exist in
 * some Full step's narration. No new prose, not even a linking sentence.
 * Captions are not narration and may be new text.
 */
import type { Cut } from "../../kit/engine/cuts";
import type { Step } from "../../kit/engine/types";
import { STEPS } from "./steps";

function step(id: string): Step {
  const found = STEPS.find((s) => s.id === id);
  if (!found) throw new Error(`techutex cuts: no Full step "${id}"`);
  return found;
}

/** The narration of Full step `id`, split into its paragraphs. */
function paragraphs(id: string): string[] {
  const text = step(id).narration;
  if (!text) throw new Error(`techutex cuts: Full step "${id}" has no narration`);
  return text.split("\n\n");
}

/** Concatenates whole paragraphs; the only way a merged narration is built. */
function compose(...parts: string[][]): string {
  return parts.flat().join("\n\n");
}

/**
 * Warm-up compressed to two slides (Medium only): the question, the
 * AGENTS.md idea and what the agent found; then the run.
 */
const warmupOrient: Step = {
  ...step("warmup-answer"),
  id: "warmup-orient",
  title: "Orientation",
  // verbatim (owner): warmup-question paragraph 1 + warmup-agents paragraph 1 + warmup-answer. The "We are in
  // VS Code ... Copilot, Kiro" and "In case of Endevor ..." paragraphs are dropped (the compressed warm-up).
  narration: compose(
    paragraphs("warmup-question").slice(0, 1),
    paragraphs("warmup-agents").slice(0, 1),
    paragraphs("warmup-answer"),
  ),
  narrationSide: "top",
};

const warmupRunMerged: Step = {
  ...step("warmup-run"),
  id: "warmup-run-merged",
  title: "Run it — green",
  // verbatim (owner): warmup-run-prompt + warmup-run (both paragraphs).
  narration: compose(paragraphs("warmup-run-prompt"), paragraphs("warmup-run")),
  narrationSide: "top",
};

const testRed: Step = {
  ...step("red-run"),
  id: "test-red",
  title: "A test for the limit — red",
  caption:
    'FAIL — status ACCEPTED, "TRANSACTION INSERTED SUCCESSFULLY": the limit isn\'t there yet. The test is written ' +
    "first; writing it to Endevor is proposed.",
  // verbatim (owner): write-new-test + red-run.
  narration: compose(paragraphs("write-new-test"), paragraphs("red-run")),
  narrationSide: "left",
};

const generateRc12: Step = {
  ...step("generate-rc12-2"),
  id: "generate-rc12",
  title: "Generate — RC 12, twice",
  caption:
    'IGYDS0017-E: the new "01" level should begin in Area A; then IGYDS0002-E / IGYDS0009-E: the COPY ' +
    "statement right after it still overlaps column 7.",
  // verbatim (owner): all three paragraphs of generate-rc12-1 + generate-rc12-2.
  narration: compose(paragraphs("generate-rc12-1"), paragraphs("generate-rc12-2")),
  narrationSide: "top",
};

const deployGreen: Step = {
  ...step("green"),
  id: "deploy-green",
  title: "Deploy, then green",
  caption:
    "Deploy is a JCL job through Zowe MCP (proposed); the phasein result is real. Both tests pass, live: the new " +
    "one REJECTED with DAILY DEBIT LIMIT EXCEEDED.",
  // verbatim (owner): deploy + green.
  narration: compose(paragraphs("deploy"), paragraphs("green")),
  narrationSide: "left",
  timerStop: true,
};

/**
 * The closing pair, in both shorter cuts: the process diagram, then the
 * Full compare step ITSELF (same object, id "compare"). One slide carrying
 * both was tried and rejected: at 1280x720 the compact diagram's node labels
 * rendered near 7 px with overlapping boxes.
 */
const closingProcess: Step = {
  ...step("process"),
  id: "closing-process",
  title: "The same ticket, two ways",
  // verbatim (owner): paragraph 2 of the process step only ("With AI coding agents the role of the developer shifts ...").
  narration: compose(paragraphs("process").slice(1, 2)),
  narrationSide: "top",
};
const compareStep = step("compare");

const ids = (list: string[]): Step[] => list.map(step);

export const FULL_CUT: Cut = {
  id: "full",
  label: "Full",
  blurb: "Every step, as recorded: the warm-up, each compile, the diagrams.",
  steps: STEPS,
};

export const MEDIUM_CUT: Cut = {
  id: "medium",
  label: "Medium",
  blurb: "The whole story with a compressed warm-up and the compile rounds merged.",
  steps: [
    ...ids(["title", "before-accepted"]),
    warmupOrient,
    warmupRunMerged,
    ...ids(["ticket", "plan", "write-new-test", "red-run", "diff-v0-v1", "host-write-approval"]),
    generateRc12,
    ...ids(["diff-v0-v2", "deploy", "green", "after-refused"]),
    closingProcess,
    compareStep,
  ],
};

export const SHORT_CUT: Cut = {
  id: "short",
  label: "Short",
  blurb: "Ticket, plan, red test, the change, the fix, green, refused: the shortest complete story.",
  steps: [
    ...ids(["title", "before-accepted", "ticket", "plan"]),
    testRed,
    ...ids(["diff-v0-v1", "host-write-approval"]),
    generateRc12,
    ...ids(["diff-v0-v2"]),
    deployGreen,
    ...ids(["after-refused"]),
    closingProcess,
    compareStep,
  ],
};

export const CUTS: Cut[] = [FULL_CUT, MEDIUM_CUT, SHORT_CUT];
