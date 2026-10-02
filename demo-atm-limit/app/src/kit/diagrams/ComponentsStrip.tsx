/**
 * The architecture strip: small boxes for the path a request travels, with
 * a packet dot that can travel along it. No longer a standalone step (that
 * scene painted badly at full screen — abutting boxes hid their own
 * arrows, a stranded last box, a stranded dot) — AtmScene embeds this
 * underneath itself on every ATM step instead, sized for that strip.
 * `boxes` comes from the demo's own content (PresentationContent
 * .components) — nothing here names a specific architecture.
 */
import { Fragment } from "react";
import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import type { DiagramStep } from "../engine/types";
import type { ComponentBox } from "../engine/content";
import "./ComponentsStrip.css";

/**
 * Pure arithmetic behind useBoxCenters, pulled out so it can be unit-tested
 * without a DOM: `getBoundingClientRect()` returns SCREEN (post-Stage-scale)
 * pixels, but the packet's `left` is applied in DESIGN-space (unscaled)
 * pixels, same as everything else under `.stage-inner` (see Stage.tsx's own
 * header comment). Dividing by the track's own scale factor —
 * `containerRect.width / containerOffsetWidth` (offsetWidth is layout-space,
 * unaffected by the CSS `scale()` transform) — converts back before the
 * packet's `left` is set, so a box glowing on the LAST step doesn't strand
 * the packet partway there at any zoom.
 */
export function boxCentersFromRects(
  containerRect: { left: number; width: number },
  boxRects: Array<{ left: number; width: number }>,
  containerOffsetWidth: number,
): number[] {
  const scale = containerOffsetWidth > 0 ? containerRect.width / containerOffsetWidth : 1;
  return boxRects.map((r) => (r.left - containerRect.left + r.width / 2) / scale);
}

/** Measures each box's horizontal center, relative to the track's own left edge, for the packet dot to travel between. */
function useBoxCenters(trackRef: React.RefObject<HTMLDivElement | null>): number[] {
  const [centers, setCenters] = useState<number[]>([]);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const containerRect = el.getBoundingClientRect();
      const boxes = el.querySelectorAll<HTMLElement>(".diagram-box");
      const boxRects = Array.from(boxes).map((b) => b.getBoundingClientRect());
      setCenters(boxCentersFromRects(containerRect, boxRects, el.offsetWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [trackRef]);

  return centers;
}

export function ComponentsStrip({
  boxes,
  diagram,
  instant,
  onPacketReturn,
}: {
  boxes: ComponentBox[];
  diagram?: DiagramStep;
  instant: boolean;
  onPacketReturn?: () => void;
}): React.JSX.Element {
  const highlight = new Set(diagram?.highlight ?? []);
  const packet = diagram?.packet ?? "none";
  const trackRef = useRef<HTMLDivElement>(null);
  const centers = useBoxCenters(trackRef);

  const showPacket = packet !== "none" && !instant && centers.length === boxes.length;

  let waypoints: number[] = [];
  if (showPacket) {
    const first = centers[0]!;
    const last = centers[centers.length - 1]!;
    if (packet === "round-trip") waypoints = [first, last, first];
    else if (packet === "atm-to-host") waypoints = [first, last];
    else waypoints = [last, first];
  }

  return (
    <div className="diagram-strip" ref={trackRef}>
      <div className="diagram-strip-row">
        {boxes.map((b, i) => (
          <Fragment key={b.id}>
            {/* data-keep-clear: NarrationCallout.tsx avoids covering
                individual boxes (not the whole strip at once — a tall
                stack elsewhere, e.g. ProcessScene's lanes, would leave the
                callout nowhere to sit if it had to clear the whole
                container). */}
            <div className={`diagram-box ${highlight.has(b.id) ? "glow" : ""}`} data-keep-clear="true">
              <div className="diagram-box-label">{b.label}</div>
              <div className="diagram-box-sub">{b.sub}</div>
            </div>
            {i < boxes.length - 1 && (
              <div className="diagram-arrow" aria-hidden="true">
                <span className="diagram-arrow-line" />
                <span className="diagram-arrow-head" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
      {showPacket && (
        <motion.div
          className="diagram-packet"
          initial={{ left: waypoints[0] }}
          animate={{ left: waypoints }}
          // 3s round trip (owner: "seems quite quick" at the old 1.5s) —
          // `times` stays [0, 0.5, 1] so the outbound and return legs stay
          // equal shares of `duration`, not just this one value.
          transition={{ duration: 3, ease: "easeInOut", times: waypoints.length === 3 ? [0, 0.5, 1] : undefined }}
          onAnimationComplete={onPacketReturn}
        />
      )}
    </div>
  );
}
