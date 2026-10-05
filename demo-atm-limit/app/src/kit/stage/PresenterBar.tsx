/**
 * The bottom presenter bar: step title, caption, the narration/review/voice
 * controls (kit/stage/PresenterControls.tsx — every step has this bar, so
 * this is the one place these are reachable), a step counter, and the
 * collapse toggle. Visible by default and readable from the back of a
 * room; collapsing it (far-right "⌄", or "B") hides the whole strip and
 * leaves only the small fixed expand button ("⌃", bottom-right) so the
 * audience sees nothing but the slide — StepEngine.tsx drives
 * --presenter-bar-height to 0px for this, which is what lets the stage and
 * every other bar-anchored panel reclaim the space.
 */
import { useStepEngine } from "../engine/StepEngine";
import { PresenterControls } from "./PresenterControls";
import "./PresenterBar.css";

export function PresenterBar({
  cut,
}: {
  /** Set when the demo has several cuts: shows the active cut and returns to the chooser on click. */
  cut?: { label: string; onChange: () => void };
}): React.JSX.Element {
  const { step, index, steps, hotspotFired, next, barCollapsed, toggleBar } = useStepEngine();
  const isLast = index === steps.length - 1;

  if (barCollapsed) {
    return (
      <button type="button" className="presenter-bar-expand" title="Show presenter bar" onClick={toggleBar}>
        ⌃
      </button>
    );
  }

  // A hotspot that has already fired but doesn't auto-advance (the ATM's
  // confirm: reveal in place, then a plain keypress — Hotspot.tsx's
  // advanceOnActivate) needs THIS step's cue to flip from "click" to
  // "next" the moment it fires, same as if it had no hotspot at all.
  const wantsClick = !!step.hotspot && !hotspotFired;
  return (
    <div className="presenter-bar">
      <div className="presenter-bar-title">{step.title}</div>
      <div className="presenter-bar-caption">{step.caption}</div>
      {/* What moves the story on from here — a hotspot somewhere on the
          stage, or just the next/space key — named so the presenter never
          has to guess or hunt. Omitted on the last step: nothing forward
          to cue. */}
      {!isLast && (
        <button type="button" className={`presenter-bar-cue ${wantsClick ? "cue-click" : "cue-next"}`} onClick={next}>
          {wantsClick ? "click ⟶" : "→ next"}
        </button>
      )}
      {cut && (
        <button
          type="button"
          className="pb-item presenter-bar-cut"
          title="Back to the cut chooser"
          onClick={cut.onChange}
        >
          {cut.label} · {steps.length} steps
        </button>
      )}
      <div className="presenter-bar-controls">
        <PresenterControls />
      </div>
      <div className="presenter-bar-count">
        {index + 1} / {steps.length}
      </div>
      <button type="button" className="presenter-bar-collapse" title="Hide presenter bar" onClick={toggleBar}>
        ⌄
      </button>
    </div>
  );
}
