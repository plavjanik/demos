/**
 * Two side-by-side process diagrams: the same "ticket lands, code ships"
 * loop with and without an agent. Lanes are labelled by icon (person =
 * developer, spark = agent, host = the mainframe session); a loop-back
 * decision (e.g. "RC 12?") draws a real curved arrow back up the SAME
 * lane, measured from the actual node boxes so it never runs into the
 * arrowless case DiagramScene.tsx's own header warns about (abutting boxes
 * hiding their own connectors) — see useLoopbackArcs below.
 *
 * A lane whose `chain` is false (e.g. a lane of MCP tools, which never
 * call each other) renders its nodes with no connector arrows between
 * them — see the `proc-arrow-hidden` class below, which keeps the
 * flex-spacing arrow ELEMENT (so the lane still fills its height evenly)
 * but drops its visible line/arrowhead. `ProcessDiagram.links` draws
 * what actually calls what instead: one subtle dashed line per link,
 * from whichever step uses a tool to the tool itself, over the WHOLE
 * diagram (not per-lane, since a link's two ends are always in different
 * lanes) — see useCrossLaneLinks below, which mirrors useLoopbackArcs'
 * own measuring approach one level up (the diagram, not one lane).
 */
import { Fragment, useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from "react";
import { Hotspot } from "../stage/Hotspot";
import { useStageScale } from "../stage/Stage";
import type { ProcessDiagram, ProcessLane, ProcessNode, ProcessStepData } from "../engine/types";
import "./ProcessScene.css";

const LANE_ICON: Record<ProcessLane["icon"], string> = {
  person: "codicon-person",
  spark: "codicon-sparkle",
  host: "codicon-server-process",
  tools: "codicon-plug",
};

interface Arc {
  d: string;
  label?: string;
  labelX: number;
  labelY: number;
}

/**
 * Measures each named node's box (by data-node id) and returns a
 * cubic-bezier path bulging out to the lane's right margin, from `from`
 * back up to `to`, plus where its label sits.
 *
 * `getBoundingClientRect()` returns SCREEN pixels — already multiplied by
 * the Stage's `scale` (Stage.tsx) — but this hook draws into the SVG's own
 * DESIGN-space coordinate system (same units as the `.proc-lane`/node
 * layout, i.e. as if scale were 1), and the `+46`/`+34` bulge constants
 * below are written in that same design space. Every measured delta is
 * divided by `scale` before use so the two systems match; skipping that
 * (as this used to) is invisible at scale 1 (the Stage's own design size)
 * and produces a visibly wrong, scale-dependent offset at any other size —
 * worse the smaller the window, since the constant bulge offsets stay the
 * same design-space size while the measured node geometry shrinks toward
 * zero relative to them.
 *
 * Recomputed on resize/reveal (a not-yet-revealed node has no box yet), on
 * the Stage's own scale changing (a ResizeObserver on `container` alone
 * does NOT fire for this: `.proc-lane`'s layout box is a fixed DESIGN-space
 * size that never changes, only the ancestor's CSS `scale()` transform
 * does), and once `document.fonts.ready` — a node whose label wraps
 * differently once the real font is in shifts every box below it.
 */
function useLoopbackArcs(
  containerRef: React.RefObject<HTMLDivElement | null>,
  loopbacks: { from: string; to: string; label?: string }[] | undefined,
  revealed: number,
): Arc[] {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const scale = useStageScale();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !loopbacks?.length) {
      setArcs([]);
      return;
    }
    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const next: Arc[] = [];
      // Two loop-backs in this story always land on the SAME target ("Edit")
      // — stagger each one's bulge further out by its index, or the curves
      // draw on top of each other and the labels collide.
      loopbacks.forEach((lb, i) => {
        // Both ends must be REVEALED (the "shown" class), not merely present
        // in the DOM — every node renders from the start (opacity 0 until
        // revealed) so an unqualified selector finds `to` and `from` long
        // before either is visible, drawing the arrow into empty space. A
        // loop-back points backwards, so `to`'s index is always < `from`'s;
        // checking `from` alone would already cover it, but checking both
        // states the real requirement and survives that assumption changing.
        const fromEl = container.querySelector<HTMLElement>(`[data-node="${lb.from}"].shown`);
        const toEl = container.querySelector<HTMLElement>(`[data-node="${lb.to}"].shown`);
        if (!fromEl || !toEl) return;
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        // Screen-px deltas -> design-space px: divide by scale.
        const x = (fr.right - containerRect.left) / scale;
        const y1 = (fr.top - containerRect.top) / scale + fr.height / scale / 2;
        const y2 = (tr.top - containerRect.top) / scale + tr.height / scale / 2;
        const bulge = x + 46 + i * 34;
        next.push({
          d: `M ${x} ${y1} C ${bulge} ${y1}, ${bulge} ${y2}, ${x} ${y2}`,
          label: lb.label,
          labelX: bulge,
          labelY: (y1 + y2) / 2,
        });
      });
      setArcs(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, loopbacks, revealed, scale]);

  return arcs;
}

export interface ProcessRowPlacement {
  /** Node id -> 0-based row index it occupies. */
  rowOfNode: Map<string, number>;
  totalRows: number;
}

/**
 * Pure mapping from `ProcessDiagram.sequence` to each node's row, pulled
 * out so the row/reveal mapping is unit-testable without a DOM (mirrors
 * ComponentsStrip.tsx's `boxCentersFromRects` — a measuring/layout hook's
 * own arithmetic core, extracted). A node id that `sequence` never
 * mentions gets its own row after every sequence row, in the order its
 * lane defines it (stable across lanes since `diagram.lanes` itself has a
 * fixed order) — see `ProcessDiagram.sequence`'s own doc comment for why:
 * it reveals last rather than failing to render.
 */
export function computeRowPlacement(diagram: ProcessDiagram): ProcessRowPlacement {
  const rowOfNode = new Map<string, number>();
  const sequence = diagram.sequence ?? [];
  sequence.forEach((entry, row) => {
    for (const id of Array.isArray(entry) ? entry : [entry]) {
      rowOfNode.set(id, row);
    }
  });
  let nextRow = sequence.length;
  for (const lane of diagram.lanes) {
    for (const node of lane.nodes) {
      if (!rowOfNode.has(node.id)) rowOfNode.set(node.id, nextRow++);
    }
  }
  return { rowOfNode, totalRows: Math.max(nextRow, 1) };
}

/**
 * `ProcessDiagram.sequence` naming a node id no lane has is a data bug,
 * same treatment as `validateProcessLinks` below (fails loud in dev,
 * warns anywhere else) — the reverse direction (a lane node absent from
 * `sequence`) is not an error, see the field's own doc comment.
 */
function validateProcessSequence(diagram: ProcessDiagram): void {
  if (!diagram.sequence?.length) return;
  const ids = new Set(diagram.lanes.flatMap((l) => l.nodes.map((n) => n.id)));
  for (const entry of diagram.sequence) {
    for (const id of Array.isArray(entry) ? entry : [entry]) {
      if (ids.has(id)) continue;
      const message = `ProcessDiagram.sequence: node id not found in "${diagram.title}" — ${JSON.stringify(id)}`;
      if (import.meta.env.DEV) throw new Error(message);
      console.warn(message);
    }
  }
}

interface ChainLine {
  d: string;
}

/**
 * Sequence-mode row connectors. A lane's own nodes no longer sit DOM-
 * adjacent once `ProcessDiagram.sequence` can put empty rows between two
 * of them (e.g. an approval row that belongs to another lane), so the
 * old CSS-only `.proc-arrow-down` (a flex filler between adjacent
 * siblings, still used by a non-sequence diagram) can't span the gap.
 * This measures each consecutive pair of a chained lane's OWN nodes (by
 * data-node, both `.shown`) the same way useLoopbackArcs does — see its
 * comment for why the screen-px deltas need dividing by `scale` — and
 * draws a straight line from the bottom of the earlier one to the top of
 * the later one, arrowhead at the lower end; a pair not yet both revealed
 * draws nothing, same reveal gate as useLoopbackArcs.
 */
function useChainConnectors(
  containerRef: React.RefObject<HTMLDivElement | null>,
  nodes: ProcessNode[],
  chained: boolean,
  revealed: number,
): ChainLine[] {
  const [lines, setLines] = useState<ChainLine[]>([]);
  const scale = useStageScale();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !chained || nodes.length < 2) {
      setLines([]);
      return;
    }
    const measure = () => {
      // The SVG is positioned inside .proc-lane-grid (below the lane
      // header), not the lane itself — measure from the grid's own origin,
      // or every line lands one header-height too low and runs through the
      // next box (measured 30 design px at 1920×1080).
      const origin = container.querySelector<HTMLElement>(".proc-lane-grid") ?? container;
      const containerRect = origin.getBoundingClientRect();
      const next: ChainLine[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        const fromEl = container.querySelector<HTMLElement>(`[data-node="${nodes[i]!.id}"].shown`);
        const toEl = container.querySelector<HTMLElement>(`[data-node="${nodes[i + 1]!.id}"].shown`);
        if (!fromEl || !toEl) continue;
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        const x = (fr.left - containerRect.left) / scale + fr.width / scale / 2;
        const y1 = (fr.bottom - containerRect.top) / scale;
        const y2 = (tr.top - containerRect.top) / scale;
        if (y2 <= y1) continue; // out-of-order/overlapping boxes — draw nothing rather than a backwards line
        next.push({ d: `M ${x} ${y1} L ${x} ${y2}` });
      }
      setLines(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, nodes, chained, revealed, scale]);

  return lines;
}

/** Sequence-mode layout for one Lane: shared across every lane of the same diagram (ProcessScene.tsx's Diagram computes it once). */
interface SequenceLayout {
  rowOfNode: Map<string, number>;
  totalRows: number;
  revealedRows: number;
}

function isNodeShown(n: ProcessNode, i: number, revealed: number, sequenceLayout: SequenceLayout | undefined): boolean {
  if (sequenceLayout) {
    const row = sequenceLayout.rowOfNode.get(n.id);
    return row !== undefined && row < sequenceLayout.revealedRows;
  }
  return i < revealed;
}

function Lane({
  lane,
  revealed,
  firstNodeHotspotId,
  wide,
  sequenceLayout,
}: {
  lane: ProcessLane;
  revealed: number;
  firstNodeHotspotId?: string;
  wide?: boolean;
  sequenceLayout?: SequenceLayout;
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const arcs = useLoopbackArcs(containerRef, lane.loopbacks, sequenceLayout?.revealedRows ?? revealed);
  const chainLines = useChainConnectors(
    containerRef,
    lane.nodes,
    lane.chain !== false,
    sequenceLayout?.revealedRows ?? revealed,
  );
  const markerId = useId();
  const chainMarkerId = useId();
  const chained = lane.chain !== false;

  return (
    <div
      className={`proc-lane ${lane.loopbacks?.length ? "proc-lane-has-arcs" : ""} ${wide ? "proc-lane-wide" : ""}`}
      ref={containerRef}
    >
      <div className="proc-lane-header">
        <span className={`codicon ${LANE_ICON[lane.icon]}`} />
        <span className="proc-lane-label">{lane.label}</span>
      </div>
      {sequenceLayout ? (
        <div
          className="proc-lane-grid"
          style={{ gridTemplateRows: `repeat(${sequenceLayout.totalRows}, minmax(0, 1fr))` }}
        >
          {lane.nodes.map((n, i) => {
            const shown = isNodeShown(n, i, revealed, sequenceLayout);
            const row = sequenceLayout.rowOfNode.get(n.id) ?? sequenceLayout.totalRows - 1;
            const node = (
              // See the non-sequence branch below for why data-keep-clear
              // is set regardless of narrationSide.
              <div
                className={`proc-node ${n.decision ? "proc-node-decision" : ""} ${shown ? "shown" : ""}`}
                data-node={n.id}
                data-keep-clear="true"
                style={{ gridRow: row + 1 }}
              >
                <div>{n.label}</div>
                {n.timeHint && <div className="proc-node-time">{n.timeHint}</div>}
              </div>
            );
            return i === 0 && firstNodeHotspotId ? (
              <Hotspot key={n.id} id={firstNodeHotspotId} compact labelPlacement="right">
                {node}
              </Hotspot>
            ) : (
              <Fragment key={n.id}>{node}</Fragment>
            );
          })}
          {chainLines.length > 0 && (
            <svg className="proc-chain-lines" aria-hidden="true">
              <defs>
                <marker
                  id={`proc-chain-arrow-${chainMarkerId}`}
                  markerWidth="9"
                  markerHeight="9"
                  refX="6.5"
                  refY="4.5"
                  orient="auto"
                >
                  <path d="M0,0 L9,4.5 L0,9 z" fill="#5a5d62" />
                </marker>
              </defs>
              {chainLines.map((l, i) => (
                <path
                  key={i}
                  d={l.d}
                  fill="none"
                  stroke="#5a5d62"
                  strokeWidth="2"
                  markerEnd={`url(#proc-chain-arrow-${chainMarkerId})`}
                />
              ))}
            </svg>
          )}
        </div>
      ) : (
        <div className="proc-lane-nodes">
          {lane.nodes.map((n, i) => {
            const node = (
              // data-keep-clear (NarrationCallout.tsx): this lane's nodes are
              // still marked, even though narrationSide:"top" (the only
              // placement this scene actually uses) never runs the
              // data-keep-clear lift — a "left"/"right" lift was tried
              // against these nodes and reverted (packed with no gap tall
              // enough to ever find real clear space; see the process step's
              // own comment in steps.ts), but marking them costs nothing and
              // keeps this scene correctly covered if it's ever paired with
              // "left"/"right" again.
              <div
                className={`proc-node ${n.decision ? "proc-node-decision" : ""} ${i < revealed ? "shown" : ""}`}
                data-node={n.id}
                data-keep-clear="true"
              >
                <div>{n.label}</div>
                {n.timeHint && <div className="proc-node-time">{n.timeHint}</div>}
              </div>
            );
            return (
              <Fragment key={n.id}>
                {i === 0 && firstNodeHotspotId ? (
                  <Hotspot id={firstNodeHotspotId} compact labelPlacement="right">
                    {node}
                  </Hotspot>
                ) : (
                  node
                )}
                {i < lane.nodes.length - 1 && (
                  // Always rendered (even when !chained) — it's what stretches
                  // this lane's nodes across its full flex height (see its own
                  // CSS comment); proc-arrow-hidden only drops the visible
                  // connector line/arrowhead, keeping the spacing.
                  <div
                    className={`proc-arrow-down ${i < revealed - 1 ? "shown" : ""} ${chained ? "" : "proc-arrow-hidden"}`}
                    aria-hidden="true"
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      )}
      {arcs.length > 0 && (
        <>
          <svg className="proc-arcs" aria-hidden="true">
            <defs>
              <marker
                id={`proc-arrow-${markerId}`}
                markerWidth="9"
                markerHeight="9"
                refX="6.5"
                refY="4.5"
                orient="auto"
              >
                <path d="M0,0 L9,4.5 L0,9 z" fill="var(--accent-amber)" />
              </marker>
            </defs>
            {arcs.map((a, i) => (
              <path
                key={i}
                d={a.d}
                fill="none"
                stroke="var(--accent-amber)"
                strokeWidth="2.5"
                markerEnd={`url(#proc-arrow-${markerId})`}
              />
            ))}
          </svg>
          {arcs.map(
            (a, i) =>
              a.label && (
                <span key={i} className="proc-arc-label" style={{ left: a.labelX, top: a.labelY }} aria-hidden="true">
                  {a.label}
                </span>
              ),
          )}
        </>
      )}
    </div>
  );
}

function totalNodes(diagram: ProcessDiagram): number {
  return diagram.lanes.reduce((sum, l) => sum + l.nodes.length, 0);
}

interface LinkArc {
  d: string;
}

/**
 * Measures each linked pair of nodes (by data-node id, ANYWHERE in the
 * diagram — a link always crosses lanes, unlike useLoopbackArcs' single-
 * lane scope) and returns a straight path from the nearer edge of `from`'s
 * box to the nearer edge of `to`'s box. Mirrors useLoopbackArcs' own
 * scale-correction and "both ends must be .shown" reveal gate — see its
 * comment for why the screen-px deltas need dividing by `scale` before use.
 */
function useCrossLaneLinks(
  containerRef: React.RefObject<HTMLDivElement | null>,
  links: { from: string; to: string }[] | undefined,
  revealed: number,
): LinkArc[] {
  const [arcs, setArcs] = useState<LinkArc[]>([]);
  const scale = useStageScale();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !links?.length) {
      setArcs([]);
      return;
    }
    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const toDesignX = (x: number) => (x - containerRect.left) / scale;
      const toDesignY = (y: number) => (y - containerRect.top) / scale;
      const next: LinkArc[] = [];
      for (const link of links) {
        const fromEl = container.querySelector<HTMLElement>(`[data-node="${link.from}"].shown`);
        const toEl = container.querySelector<HTMLElement>(`[data-node="${link.to}"].shown`);
        if (!fromEl || !toEl) continue;
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        const fromY = toDesignY(fr.top) + fr.height / scale / 2;
        const toY = toDesignY(tr.top) + tr.height / scale / 2;
        let x1: number;
        let x2: number;
        if (fr.right <= tr.left) {
          // `from` sits left of `to` — the common case, an agent step
          // linking right to a tool lane.
          x1 = toDesignX(fr.right);
          x2 = toDesignX(tr.left);
        } else if (fr.left >= tr.right) {
          x1 = toDesignX(fr.left);
          x2 = toDesignX(tr.right);
        } else {
          // Horizontally overlapping boxes (not this story's own layout,
          // but a generic link isn't guaranteed left-to-right) — fall back
          // to each box's own horizontal center so the line stays well-formed.
          x1 = toDesignX(fr.left) + fr.width / scale / 2;
          x2 = toDesignX(tr.left) + tr.width / scale / 2;
        }
        next.push({ d: `M ${x1} ${fromY} L ${x2} ${toY}` });
      }
      setArcs(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, links, revealed, scale]);

  return arcs;
}

/**
 * `ProcessDiagram.links` referencing a node id this diagram doesn't have
 * is a data bug, not a runtime possibility to render around — fails loud
 * in dev (so it's caught before it ships), degrades to a console warning
 * (and simply draws no line for that link) anywhere else.
 */
function validateProcessLinks(diagram: ProcessDiagram): void {
  if (!diagram.links?.length) return;
  const ids = new Set(diagram.lanes.flatMap((l) => l.nodes.map((n) => n.id)));
  for (const link of diagram.links) {
    if (ids.has(link.from) && ids.has(link.to)) continue;
    const message = `ProcessDiagram.links: node id not found in "${diagram.title}" — ${JSON.stringify(link)}`;
    if (import.meta.env.DEV) throw new Error(message);
    console.warn(message);
  }
}

/** The whole-diagram overlay for ProcessDiagram.links — one thin dashed muted line per link, arrowhead at the `to` end, drawn once both ends are revealed. */
function CrossLaneLinks({
  diagram,
  containerRef,
  revealed,
}: {
  diagram: ProcessDiagram;
  containerRef: React.RefObject<HTMLDivElement | null>;
  revealed: number;
}): React.JSX.Element | null {
  const arcs = useCrossLaneLinks(containerRef, diagram.links, revealed);
  const markerId = useId();
  if (arcs.length === 0) return null;

  return (
    <svg className="proc-links" aria-hidden="true">
      <defs>
        <marker id={`proc-link-arrow-${markerId}`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="var(--vsc-fg-muted)" />
        </marker>
      </defs>
      {arcs.map((a, i) => (
        <path
          key={i}
          d={a.d}
          fill="none"
          stroke="var(--vsc-fg-muted)"
          strokeWidth="1.25"
          strokeDasharray="3 3"
          markerEnd={`url(#proc-link-arrow-${markerId})`}
        />
      ))}
    </svg>
  );
}

// Fallback pace when a Diagram carries no revealMsPerNode of its own
// (ProcessDiagram.revealMsPerNode, kit/engine/types.ts) — only matters for
// a diagram whose demo doesn't set one explicitly.
const DEFAULT_REVEAL_MS = 260;

function useReveal(count: number, instant: boolean, revealMsPerNode: number): number {
  const [revealed, setRevealed] = useState(instant ? count : 0);
  useEffect(() => {
    if (instant) {
      setRevealed(count);
      return;
    }
    setRevealed(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= count) clearInterval(id);
    }, revealMsPerNode);
    return () => clearInterval(id);
  }, [count, instant, revealMsPerNode]);
  return revealed;
}

function Diagram({
  diagram,
  instant,
  firstNodeHotspotId,
}: {
  diagram: ProcessDiagram;
  instant: boolean;
  firstNodeHotspotId?: string;
}): React.JSX.Element {
  // A diagram carrying `sequence` computes its row placement once (pure,
  // see computeRowPlacement) and reveals by ROW, not by flattened node
  // count — every lane reads the SAME revealedRows, so a row's one or two
  // ids appear together regardless of which lane(s) they're in.
  const rowPlacement = useMemo(() => (diagram.sequence ? computeRowPlacement(diagram) : undefined), [diagram]);
  const revealed = useReveal(
    rowPlacement ? rowPlacement.totalRows : totalNodes(diagram),
    instant,
    diagram.revealMsPerNode ?? DEFAULT_REVEAL_MS,
  );
  const linksContainerRef = useRef<HTMLDivElement>(null);
  validateProcessLinks(diagram);
  validateProcessSequence(diagram);
  let seen = 0;

  return (
    <div className="proc-diagram">
      <div className="proc-diagram-title">{diagram.title}</div>
      <div className="proc-diagram-lanes" ref={linksContainerRef}>
        {diagram.links && <CrossLaneLinks diagram={diagram} containerRef={linksContainerRef} revealed={revealed} />}
        {diagram.lanes.map((lane, laneIndex) => {
          const laneRevealed = Math.max(0, Math.min(lane.nodes.length, revealed - seen));
          const startIndex = seen;
          seen += lane.nodes.length;
          return (
            <Lane
              key={lane.label}
              lane={lane}
              revealed={laneRevealed}
              firstNodeHotspotId={(rowPlacement ? laneIndex === 0 : startIndex === 0) ? firstNodeHotspotId : undefined}
              // A diagram with only one lane (the "without an agent" side)
              // has the whole diagram's width to itself — don't squeeze its
              // node text into the same 260px a 3-lane diagram needs.
              wide={diagram.lanes.length === 1}
              sequenceLayout={
                rowPlacement && {
                  rowOfNode: rowPlacement.rowOfNode,
                  totalRows: rowPlacement.totalRows,
                  revealedRows: revealed,
                }
              }
            />
          );
        })}
      </div>
      {diagram.summary && (
        <div className={`proc-summary ${diagram.summaryAccent ? "proc-summary-accent" : ""}`}>
          <div className="proc-summary-main">{diagram.summary}</div>
          {diagram.summarySub && <div className="proc-summary-sub">{diagram.summarySub}</div>}
        </div>
      )}
    </div>
  );
}

export function ProcessScene({ data, instant }: { data: ProcessStepData; instant: boolean }): React.JSX.Element {
  return (
    <div className="proc-scene">
      <div className="proc-halves">
        <Diagram diagram={data.left} instant={instant} />
        <div className="proc-divider" aria-hidden="true" />
        <Diagram diagram={data.right} instant={instant} firstNodeHotspotId="process-right-first" />
      </div>
    </div>
  );
}
