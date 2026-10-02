/**
 * The compare step's headline ratio ("≈ N× faster") — ONE formula, used by
 * both CompareScene.tsx (the slide itself) and, so a title slide or any
 * other scene can quote the same number without retyping it, any demo's
 * own steps.ts. Never hand-type the ratio anywhere else.
 */
import type { CompareData } from "./content";

/**
 * Ratio against the LAST manual row (the fullest deliverable a demo lists,
 * e.g. "including test authoring") over the measured agent total, rounded
 * to the nearest 5 — a coarse "how much faster" headline; the exact
 * bars/totals on the slide itself stay precise.
 */
export function roundedRatio(compare: CompareData): number {
  const agentTotalMin = compare.agent.groups.reduce((sum, g) => sum + g.ms, 0) / 60000;
  const manualTotals = compare.manual.map((row) => row.kinds.mechanics + row.kinds.typing + row.kinds.thinking);
  const ratioBaseMin = manualTotals[manualTotals.length - 1] ?? 0;
  if (agentTotalMin <= 0) return 0;
  const ratio = ratioBaseMin / agentTotalMin;
  return Math.round(ratio / 5) * 5;
}
