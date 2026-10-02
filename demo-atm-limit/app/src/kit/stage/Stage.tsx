/**
 * Every scene is designed for 1920x1080 and scaled uniformly to fit
 * whatever viewport it's actually shown in (a laptop during rehearsal, a
 * projector during the talk) — never reflows, never scrolls.
 *
 * Everything under `.stage-inner` is laid out in DESIGN-space pixels (the
 * inner div's own width/height never change, only its CSS `scale()`
 * transform does) — so `getBoundingClientRect()` on any descendant returns
 * SCREEN pixels, already multiplied by `scale`. Any code that measures two
 * descendants and draws something (an SVG path, an offset) using those
 * raw deltas is silently wrong at any scale other than 1 — the deltas need
 * dividing by `scale` first to land back in the design-space units
 * everything else (including any constant pixel offset in that drawing
 * code) is expressed in. `StageScaleContext` is that scale, exposed so
 * that code (ProcessScene.tsx's loop-back arcs) doesn't have to re-derive
 * it. A `data-scale` attribute is set on `.stage-inner` too, for any
 * non-React consumer or quick DOM inspection.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useStepEngine } from "../engine/StepEngine";
import "./Stage.css";

const DESIGN_W = 1920;
const DESIGN_H = 1080;

export const StageScaleContext = createContext(1);

/** The Stage's current design-space -> screen-space scale factor (1 at the 1920x1080 design size, less than 1 when fit to a smaller viewport). Defaults to 1 outside a Stage (e.g. bench.tsx), which is the correct no-op. */
export function useStageScale(): number {
  return useContext(StageScaleContext);
}

export function Stage({ children }: { children: ReactNode }): React.JSX.Element {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // A step whose narrationSide is "top" reserves --narration-top-height of
  // real screen pixels above the fitting box, and review mode (any step)
  // reserves --review-panel-width on the right, for ReviewPanel.tsx — the
  // SAME mechanism the class already used for the presenter bar below.
  // The ResizeObserver stays attached across renders (same DOM node), so
  // it re-fires on its own the instant either class changes outerRef's
  // actual box — no dependency array needed to force a re-subscribe.
  const { step, reviewMode } = useStepEngine();
  const topReserved = step.narrationSide === "top";

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.min(width / DESIGN_W, height / DESIGN_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const outerClass = [
    "stage-outer",
    topReserved && "stage-outer-top-reserved",
    reviewMode && "stage-outer-review-reserved",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={outerRef} className={outerClass}>
      <div
        className="stage-inner"
        data-scale={scale}
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <StageScaleContext.Provider value={scale}>{children}</StageScaleContext.Provider>
      </div>
    </div>
  );
}
