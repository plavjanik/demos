import { describe, expect, it } from "vitest";
import { computeRowPlacement } from "./ProcessScene";
import type { ProcessDiagram } from "../engine/types";

function diagram(overrides: Partial<ProcessDiagram>): ProcessDiagram {
  return {
    title: "t",
    lanes: [
      {
        icon: "person",
        label: "Developer",
        nodes: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      },
      {
        icon: "spark",
        label: "Agent",
        nodes: [
          { id: "c", label: "C" },
          { id: "d", label: "D" },
        ],
      },
    ],
    ...overrides,
  };
}

describe("computeRowPlacement", () => {
  it("places one sequence entry per row, in order", () => {
    const { rowOfNode, totalRows } = computeRowPlacement(diagram({ sequence: ["a", "c", "b", "d"] }));
    expect(rowOfNode.get("a")).toBe(0);
    expect(rowOfNode.get("c")).toBe(1);
    expect(rowOfNode.get("b")).toBe(2);
    expect(rowOfNode.get("d")).toBe(3);
    expect(totalRows).toBe(4);
  });

  it("puts every id of an array entry on the SAME row — the shared-row case (an agent step and the MCP tool it calls)", () => {
    const { rowOfNode, totalRows } = computeRowPlacement(diagram({ sequence: ["a", ["c", "d"], "b"] }));
    expect(rowOfNode.get("a")).toBe(0);
    expect(rowOfNode.get("c")).toBe(1);
    expect(rowOfNode.get("d")).toBe(1);
    expect(rowOfNode.get("b")).toBe(2);
    expect(totalRows).toBe(3);
  });

  it("places a lane node id absent from sequence on its own row AFTER every sequence row, in lane order", () => {
    // "d" never appears in `sequence` — it should land after row 1 (the
    // last authored row), not collide with an authored row or vanish.
    const { rowOfNode, totalRows } = computeRowPlacement(diagram({ sequence: ["a", "c"] }));
    expect(rowOfNode.get("a")).toBe(0);
    expect(rowOfNode.get("c")).toBe(1);
    // "b" (Developer lane, after "a") and "d" (Agent lane, after "c") both
    // fall after the sequence, in the order diagram.lanes itself visits
    // them — Developer's "b" before Agent's "d".
    expect(rowOfNode.get("b")).toBe(2);
    expect(rowOfNode.get("d")).toBe(3);
    expect(totalRows).toBe(4);
  });

  it("gives every lane node its own trailing row when there is no sequence at all", () => {
    const { rowOfNode, totalRows } = computeRowPlacement(diagram({}));
    expect([...rowOfNode.entries()]).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
      ["d", 3],
    ]);
    expect(totalRows).toBe(4);
  });

  it("a revealedRows count below a node's row means that node is not yet shown (the reveal side of the mapping)", () => {
    const { rowOfNode } = computeRowPlacement(diagram({ sequence: ["a", ["c", "d"], "b"] }));
    const shownAt = (revealedRows: number, id: string) => (rowOfNode.get(id) ?? Infinity) < revealedRows;
    expect(shownAt(1, "a")).toBe(true);
    expect(shownAt(1, "c")).toBe(false);
    expect(shownAt(2, "c")).toBe(true);
    expect(shownAt(2, "d")).toBe(true); // shares row 1 with "c" — revealed together
    expect(shownAt(2, "b")).toBe(false);
    expect(shownAt(3, "b")).toBe(true);
  });
});
