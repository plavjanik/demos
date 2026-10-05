import { describe, expect, it } from "vitest";
import { buildReviewMarkdown, effectiveText, type ReviewData } from "./reviewData";
import type { Step } from "./types";

const STEPS: Step[] = [
  { id: "title", scene: "title", title: "Title", caption: "c1" },
  { id: "plan", scene: "vscode", title: "Plan", caption: "c2" },
];

describe("buildReviewMarkdown — text edits block", () => {
  it("prints a '**Text edits:**' block per step, one line per edit, none stale", () => {
    const data: ReviewData = {
      plan: {
        textEdits: [
          { stepId: "plan", path: "div:nth-of-type(2)", original: "Retrieve the source", edited: "Fetch the source" },
        ],
      },
    };
    const md = buildReviewMarkdown(STEPS, data, "abc123");
    expect(md).toContain("## plan — Plan");
    expect(md).toContain("**Text edits:**");
    expect(md).toContain('- `div:nth-of-type(2)`: "Retrieve the source" → "Fetch the source"');
    expect(md).not.toContain("stale");
  });

  it("marks a stale edit distinctly from a live one, both in the same step", () => {
    const data: ReviewData = {
      plan: {
        textEdits: [
          { stepId: "plan", path: "p:nth-of-type(1)", original: "A", edited: "B" },
          { stepId: "plan", path: "p:nth-of-type(2)", original: "C", edited: "D", stale: true },
        ],
      },
    };
    const md = buildReviewMarkdown(STEPS, data, "abc123");
    expect(md).toContain('- `p:nth-of-type(1)`: "A" → "B"');
    const staleLine = md.split("\n").find((l) => l.includes('"C" → "D"'));
    expect(staleLine).toContain("stale");
  });

  it("gives a step a section for text edits ALONE, with no feedback or narration change", () => {
    const data: ReviewData = {
      title: { textEdits: [{ stepId: "title", path: "h1:nth-of-type(1)", original: "Old", edited: "New" }] },
    };
    const md = buildReviewMarkdown(STEPS, data, "abc123");
    expect(md).toContain("## title — Title");
  });

  it("skips a step with no feedback, no narration change, and no text edits", () => {
    const md = buildReviewMarkdown(STEPS, {}, "abc123");
    expect(md).not.toContain("## title");
    expect(md).not.toContain("## plan");
    expect(md).toContain("No feedback or narration edits yet");
  });
});

describe("narration override staleness", () => {
  const STEP: Step = { id: "title", scene: "title", title: "Title", caption: "c1", narration: "Original line." };

  it("applies an override recorded against the current shipped text", () => {
    const data: ReviewData = {
      title: { narration: "Edited line.", narrationOriginal: "Original line." },
    };
    expect(effectiveText(STEP, data, "narration")).toBe("Edited line.");
  });

  it("stops applying the same override once the shipped narration changes, and exports it as stale", () => {
    const changedStep: Step = { ...STEP, narration: "New shipped line." };
    const data: ReviewData = {
      title: { narration: "Edited line.", narrationOriginal: "Original line." },
    };
    // The override was typed against "Original line.", but the step now
    // ships "New shipped line." — the stage falls back to the shipped text.
    expect(effectiveText(changedStep, data, "narration")).toBe("New shipped line.");

    const md = buildReviewMarkdown([changedStep], data, "abc123");
    expect(md).toContain("- before: New shipped line.");
    expect(md).toContain("- after: Edited line. *(stale");
  });

  it("treats a legacy override with no recorded original as stale", () => {
    const data: ReviewData = { title: { narration: "Edited line." } };
    expect(effectiveText(STEP, data, "narration")).toBe("Original line.");

    const md = buildReviewMarkdown([STEP], data, "abc123");
    expect(md).toContain("- after: Edited line. *(stale");
  });
});

describe("buildReviewMarkdown — cut line", () => {
  it("names the cut after the Build line when one is passed", () => {
    expect(buildReviewMarkdown(STEPS, {}, "abc123", "short")).toContain("Build: `abc123`\nCut: `short`\n");
  });

  it("prints no Cut line without one", () => {
    expect(buildReviewMarkdown(STEPS, {}, "abc123")).not.toContain("Cut:");
  });
});
