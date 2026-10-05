import { describe, expect, it } from "vitest";
import { CUTS, FULL_CUT, MEDIUM_CUT, SHORT_CUT } from "./cuts";
import { STEPS } from "./steps";

const paragraphsOf = (text: string | undefined): string[] => (text ? text.split("\n\n") : []);

/** Every paragraph that exists verbatim in some Full step (narration or narrationAfter). */
const OWNER_PARAGRAPHS = new Set(
  STEPS.flatMap((s) => [...paragraphsOf(s.narration), ...paragraphsOf(s.narrationAfter)]),
);

describe("techutex cuts", () => {
  it("lists Full, Medium, Short in that order", () => {
    expect(CUTS.map((c) => c.id)).toEqual(["full", "medium", "short"]);
  });

  it("the Full cut is STEPS itself", () => {
    expect(FULL_CUT.steps).toBe(STEPS);
  });

  it("has the planned lengths", () => {
    expect(FULL_CUT.steps).toHaveLength(23);
    expect(MEDIUM_CUT.steps).toHaveLength(17);
    expect(SHORT_CUT.steps).toHaveLength(13);
  });

  it.each(CUTS.map((c) => [c.id, c] as const))("%s: step ids are unique", (_id, cut) => {
    const ids = cut.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CUTS.map((c) => [c.id, c] as const))(
    "%s: every narration paragraph is an owner paragraph, verbatim",
    (_id, cut) => {
      for (const s of cut.steps) {
        for (const p of [...paragraphsOf(s.narration), ...paragraphsOf(s.narrationAfter)]) {
          expect(OWNER_PARAGRAPHS.has(p), `${cut.id}/${s.id}: ${p.slice(0, 60)}`).toBe(true);
        }
      }
    },
  );

  it("keeps the process diagram third in both shorter cuts and ends with the Full compare step itself", () => {
    for (const cut of [MEDIUM_CUT, SHORT_CUT]) {
      expect(cut.steps[2]).toBe(STEPS.find((s) => s.id === "process"));
      expect(cut.steps.at(-1)).toBe(STEPS.find((s) => s.id === "compare"));
    }
  });

  it("a step kept from Full is the same object (deep links and review notes carry over)", () => {
    for (const cut of [MEDIUM_CUT, SHORT_CUT]) {
      for (const s of cut.steps) {
        const original = STEPS.find((o) => o.id === s.id);
        if (original) expect(s).toBe(original);
      }
    }
  });

  it("a merged step has a new id, not a Full id", () => {
    const fullIds = new Set(STEPS.map((s) => s.id));
    const merged = [...MEDIUM_CUT.steps, ...SHORT_CUT.steps].filter((s) => !fullIds.has(s.id)).map((s) => s.id);
    expect(new Set(merged)).toEqual(
      new Set(["warmup-orient", "warmup-run-merged", "generate-rc12", "test-red", "deploy-green"]),
    );
  });

  it("a staged or proposed beat keeps its honesty wording in the caption", () => {
    const byId = (cut: typeof SHORT_CUT, id: string) => cut.steps.find((s) => s.id === id)!;
    expect(byId(SHORT_CUT, "deploy-green").caption).toContain("proposed");
    expect(byId(SHORT_CUT, "test-red").caption).toContain("proposed");
    expect(byId(MEDIUM_CUT, "warmup-orient").caption).toContain("staged");
  });
});
