/**
 * Top-right "agent loop mm:ss" clock, running while Step.timerStart..
 * Step.timerStop is in effect. Hidden until the timer has ever started.
 */
import { useStepEngine } from "../engine/StepEngine";
import { splitClockMs } from "../engine/duration";
import "./TimerHud.css";

function formatMs(ms: number): string {
  const { minutes, seconds } = splitClockMs(ms);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function TimerHud(): React.JSX.Element | null {
  const { timerMs, timerRunning, index, steps, step, reviewMode } = useStepEngine();
  const everStarted = steps.slice(0, index + 1).some((s) => s.timerStart);
  if (!everStarted) return null;

  // The VSCodeScene's chat side bar and, now, ReviewPanel.tsx both live in
  // the top-right corner — shift the HUD clear of whichever is showing
  // rather than let it sit under either. Computed as an inline style
  // (not two separate CSS classes) so the two cases can't silently race on
  // stylesheet order when both would apply at once (a VS Code step, in
  // review mode) — the chat panel is wider, so it always wins.
  const clearsChatPanel = step.scene === "vscode" && !!step.vscode?.chat;
  const rightPx = clearsChatPanel ? 606 : reviewMode ? "calc(var(--review-panel-width) + 18px)" : 18;

  return (
    <div className={`timer-hud ${timerRunning ? "running" : "stopped"}`} style={{ right: rightPx }}>
      <span className="timer-dot" aria-hidden="true" />
      agent loop {formatMs(timerMs)}
    </div>
  );
}
