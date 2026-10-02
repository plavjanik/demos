import { describe, expect, it } from "vitest";
import { voiceListHasVoice, voiceOptionGroups } from "./voiceList";

describe("voiceOptionGroups", () => {
  it("lists cloned voices first, then built-in, each as its own group", () => {
    const groups = voiceOptionGroups({ cloned: ["tata"], builtin: ["Ana Florence", "Andrew Chipper"] });
    expect(groups).toEqual([
      { label: "Cloned", voices: ["tata"] },
      { label: "Built-in", voices: ["Ana Florence", "Andrew Chipper"] },
    ]);
  });

  it("omits an empty group instead of rendering an empty optgroup", () => {
    expect(voiceOptionGroups({ cloned: [], builtin: ["Ana Florence"] })).toEqual([
      { label: "Built-in", voices: ["Ana Florence"] },
    ]);
    expect(voiceOptionGroups({ cloned: ["tata"], builtin: [] })).toEqual([{ label: "Cloned", voices: ["tata"] }]);
    expect(voiceOptionGroups({ cloned: [], builtin: [] })).toEqual([]);
  });
});

describe("voiceListHasVoice", () => {
  const list = { cloned: ["tata"], builtin: ["Ana Florence"] };

  it("finds a cloned voice", () => {
    expect(voiceListHasVoice(list, "tata")).toBe(true);
  });

  it("finds a built-in voice", () => {
    expect(voiceListHasVoice(list, "Ana Florence")).toBe(true);
  });

  it("returns false for a voice the list doesn't know — the signal VoicePopover uses to keep the free-text input", () => {
    expect(voiceListHasVoice(list, "some-old-saved-voice")).toBe(false);
  });
});
