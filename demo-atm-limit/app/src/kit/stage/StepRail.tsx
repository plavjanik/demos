/**
 * Collapsible step list on the left edge, toggled by the "S" key. Clicking
 * a row jumps straight to that step (deep-linking via the hash).
 */
import { useStepEngine } from "../engine/StepEngine";
import "./StepRail.css";

export function StepRail(): React.JSX.Element | null {
  const { steps, index, goTo, railOpen } = useStepEngine();
  if (!railOpen) return null;

  return (
    <nav className="rail" aria-label="Step list">
      <div className="rail-header">Steps (S to close)</div>
      <div className="rail-list">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`rail-item ${i === index ? "active" : ""}`}
            onClick={() => goTo(i)}
          >
            <span className="rail-index">{i + 1}</span>
            <span>
              {s.title}
              <br />
              <span className="rail-scene">{s.scene}</span>
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
