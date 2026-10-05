import { describe, expect, it } from "vitest";
import { NARRATION_WORDS_PER_MINUTE, narrationMinutes, narrationWordCount } from "./cuts";
import type { Step } from "./types";

const step = (extra: Partial<Step>): Step => ({ id: "x", scene: "title", title: "t", caption: "c", ...extra });

describe("narrationWordCount", () => {
  it("counts words across narration and narrationAfter, ignoring Markdown markers", () => {
    const steps = [
      step({ narration: "One **two** `three`.\n\nFour five" }),
      step({ narration: "- six seven", narrationAfter: "# eight" }),
      step({}),
    ];
    expect(narrationWordCount(steps)).toBe(8);
  });

  it("does not count a bare marker as a word", () => {
    expect(narrationWordCount([step({ narration: "a - b ** c" })])).toBe(3);
  });

  it("is 0 for no narration", () => {
    expect(narrationWordCount([])).toBe(0);
  });
});

describe("narrationMinutes", () => {
  it("divides by the stated rate", () => {
    expect(narrationMinutes(NARRATION_WORDS_PER_MINUTE * 2)).toBe(2);
  });
});
