/**
 * formatHumanRounded's snap-to-scale + ratio-nearest logic — the numbers
 * pinned here are exactly the process diagram's own node/loop labels
 * (steps.ts), so a case failing here is a case the slide would get wrong.
 */
import { describe, expect, test } from "vitest";
import { formatHumanRounded } from "./manualTimings";

describe("formatHumanRounded", () => {
  test("under a minute always reads as '< 1 min'", () => {
    expect(formatHumanRounded(8 / 60)).toBe("< 1 min"); // SUBMIT the compile
    expect(formatHumanRounded(25 / 60)).toBe("< 1 min"); // Restart KICKS
    expect(formatHumanRounded(0.999)).toBe("< 1 min");
  });

  test("ratio-nearest, not absolute-distance-nearest, picks the scale step", () => {
    // 2.97 is numerically closer to 1 (diff 1.97) than to 5 (diff 2.03),
    // but reads as "5 min" to a person — the whole reason this isn't a
    // plain Math.round to the nearest table entry.
    expect(formatHumanRounded(178 / 60)).toBe("5 min"); // Page the listing (89 screens)
    expect(formatHumanRounded(665 / 60)).toBe("10 min"); // Test by hand at DSND
  });

  test("the process diagram's other real node/loop values", () => {
    expect(formatHumanRounded(10.4167)).toBe("10 min"); // Read the COBOL (ISPF)
    expect(formatHumanRounded(30)).toBe("30 min"); // Design
    expect(formatHumanRounded(60.2833)).toBe("1 h"); // Edit in ISPF
    expect(formatHumanRounded(186 / 60)).toBe("5 min"); // "compile error: +" loop label, low end
    expect(formatHumanRounded(34.6667)).toBe("30 min"); // "compile error: +" loop label, high end
  });

  test("snaps to the nearest table entry at each scale step", () => {
    expect(formatHumanRounded(1)).toBe("1 min");
    expect(formatHumanRounded(5)).toBe("5 min");
    expect(formatHumanRounded(15)).toBe("15 min");
    expect(formatHumanRounded(45)).toBe("45 min");
  });

  test("formats hours, including a non-zero remainder", () => {
    expect(formatHumanRounded(60)).toBe("1 h");
    expect(formatHumanRounded(90)).toBe("1 h 30");
    expect(formatHumanRounded(120)).toBe("2 h");
  });

  test("extends the multiples-of-30 scale past the built-in table for a larger input", () => {
    expect(formatHumanRounded(200)).toBe("3 h 30");
  });
});
