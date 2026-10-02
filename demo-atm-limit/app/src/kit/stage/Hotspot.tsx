/**
 * Wraps the one widget a step's Step.hotspot names: renders a pulsing
 * outline plus a floating label, and advances the story on click. A scene
 * passes its own hotspot id; this component decides whether that id is the
 * step's active one.
 */
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useStepEngine } from "../engine/StepEngine";
import "./Hotspot.css";

/** Clamps the label's horizontal offset so it never runs off either edge of the window. */
function useKeepInViewport(active: boolean, label: string | undefined) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) return;

    const clamp = () => {
      el.style.setProperty("--label-shift", "0px");
      const rect = el.getBoundingClientRect();
      const margin = 10;
      if (rect.right > window.innerWidth - margin) {
        el.style.setProperty("--label-shift", `${window.innerWidth - margin - rect.right}px`);
      } else if (rect.left < margin) {
        el.style.setProperty("--label-shift", `${margin - rect.left}px`);
      }
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [active, label]);

  return ref;
}

export function Hotspot({
  id,
  children,
  className,
  onActivate,
  labelPlacement = "top",
  compact = false,
  advanceOnActivate = true,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  /** Runs before advancing (e.g. a brief animation); the step only changes once it resolves. Omit for the plain click-to-advance behaviour. */
  onActivate?: () => void | Promise<void>;
  /** "right" sits the label inside the target's own right edge, vertically centered — for a short row in a tight list (Explorer) where a floating label above/below would land on a neighbour. "none" keeps the pulsing ring (and the aria-label) but skips the floating text entirely — for a target whose own visible text already IS the label (the chat panel's "Yes" approval button, and AtmScene's atm-confirm wrapper, which now sits its own cue at the button via AtmMachine's `confirmCue` prop instead of a label floating over the whole machine). */
  labelPlacement?: "top" | "right" | "none";
  /** A tighter pulsing ring for short, tightly-stacked targets (a single Explorer row) — the default ring's inset would otherwise visually bleed into the row above and below it. */
  compact?: boolean;
  /** False: fire onActivate and mark the hotspot used (Step.narrationAfter, the presenter-bar cue), but DON'T advance the step — for a hotspot that reveals something in place (the ATM's confirm) and lets the presenter linger before a plain keypress moves on. */
  advanceOnActivate?: boolean;
}): React.JSX.Element {
  const { step, next, markHotspotFired } = useStepEngine();
  const active = step.hotspot?.target === id;
  const labelRef = useKeepInViewport(active && labelPlacement === "top", step.hotspot?.label);

  if (!active) return <>{children}</>;

  const handleClick = () => {
    if (!onActivate) {
      markHotspotFired();
      if (advanceOnActivate) next();
      return;
    }
    Promise.resolve(onActivate()).then(() => {
      markHotspotFired();
      if (advanceOnActivate) next();
    });
  };

  return (
    <button
      type="button"
      data-hotspot={id}
      className={`hotspot ${compact ? "hotspot-compact" : ""} ${className ?? ""}`}
      onClick={handleClick}
      aria-label={step.hotspot?.label}
    >
      {children}
      <span className="hotspot-ring" aria-hidden="true" />
      {step.hotspot?.label && labelPlacement !== "none" && (
        <>
          {labelPlacement === "right" && (
            <span className="hotspot-label hotspot-label-right">{step.hotspot.label}</span>
          )}
          {labelPlacement === "top" && (
            <span ref={labelRef} className="hotspot-label">
              {step.hotspot.label}
            </span>
          )}
        </>
      )}
    </button>
  );
}
