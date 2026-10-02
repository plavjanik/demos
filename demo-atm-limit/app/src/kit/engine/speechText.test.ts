import { describe, expect, it } from "vitest";
import { reduceNarrationToSpeech, speechTextForStep } from "./speechText";

describe("reduceNarrationToSpeech", () => {
  it("strips bold and inline code down to their inner text", () => {
    expect(reduceNarrationToSpeech("The **daily ceiling** is `DAILY-LIMIT`.")).toBe(
      "The daily ceiling is DAILY-LIMIT.",
    );
  });

  it("strips list markers (-, *, numbered) down to each item's text", () => {
    const md = "- first item\n* second item\n1. third item";
    expect(reduceNarrationToSpeech(md)).toBe("first item.\nsecond item.\nthird item.");
  });

  it("strips heading hashes down to their text", () => {
    expect(reduceNarrationToSpeech("# The plan\n### First step")).toBe("The plan.\nFirst step.");
  });

  it("turns a paragraph break into a pause (period + newline) between blocks", () => {
    const md = "First paragraph, no period\n\nSecond paragraph.";
    expect(reduceNarrationToSpeech(md)).toBe("First paragraph, no period.\nSecond paragraph.");
  });

  it("does not double a sentence-ending punctuation mark", () => {
    expect(reduceNarrationToSpeech("Already ends with a question?")).toBe("Already ends with a question?");
  });

  it("keeps a list item's wrapped continuation line as part of the same spoken item", () => {
    const md = "- a long item that\n  wraps onto a continuation line";
    expect(reduceNarrationToSpeech(md)).toBe("a long item that wraps onto a continuation line.");
  });
});

describe("speechTextForStep", () => {
  it("reduces the shown text when no override is given", () => {
    expect(speechTextForStep("The **ceiling** is live.", undefined)).toBe("The ceiling is live.");
  });

  it("prefers the override over the shown text when both are present", () => {
    expect(speechTextForStep("$5,000.00", "five thousand dollars")).toBe("five thousand dollars.");
  });

  it("returns an empty string when neither is given", () => {
    expect(speechTextForStep(undefined, undefined)).toBe("");
  });
});
