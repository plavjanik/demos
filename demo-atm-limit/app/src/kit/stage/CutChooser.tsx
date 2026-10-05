/**
 * The opening screen of a demo that ships several cuts: a headline and one
 * card per cut. Click a card, or press its number key (1/2/3), to pick it.
 *
 * Laid out in plain responsive CSS, not inside <Stage>: Stage needs the step
 * engine, which does not exist until a cut has been chosen. CutChooser.css
 * scales every length by `--u` (the viewport's fit of the 1920x1080 design
 * box, same ratio Stage uses), so the screen reads the same at 1280x720 and
 * 1920x1080.
 *
 * The length line is DERIVED from the cut's own steps (kit/engine/cuts.ts):
 * step count, narration word count, and the stated words-per-minute rate. A
 * rate is an assumption and the card says so by printing it.
 */
import { useEffect } from "react";
import { NARRATION_WORDS_PER_MINUTE, narrationMinutes, narrationWordCount, type Cut } from "../engine/cuts";
import "./CutChooser.css";

/** "23 steps · ≈ 7 min of narration (1,034 words at 145 words/min)" — every figure computed from `cut.steps`. */
export function cutLengthLine(cut: Cut): string {
  const words = narrationWordCount(cut.steps);
  const minutes = Math.max(1, Math.round(narrationMinutes(words)));
  return (
    `${cut.steps.length} steps · ≈ ${minutes} min of narration ` +
    `(${words.toLocaleString("en-US")} words at ${NARRATION_WORDS_PER_MINUTE} words/min)`
  );
}

export function CutChooser({
  headline,
  cuts,
  onSelect,
}: {
  headline: string;
  cuts: Cut[];
  onSelect: (cut: Cut) => void;
}): React.JSX.Element {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      const cut = Number.isInteger(n) && n >= 1 ? cuts[n - 1] : undefined;
      if (cut) onSelect(cut);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cuts, onSelect]);

  return (
    <div className="cut-chooser">
      <h1 className="cut-chooser-headline">{headline}</h1>
      <p className="cut-chooser-prompt">Choose a cut</p>
      <div className="cut-chooser-cards">
        {cuts.map((cut, i) => (
          <button type="button" key={cut.id} className="cut-card" onClick={() => onSelect(cut)}>
            <span className="cut-card-label">{cut.label}</span>
            <span className="cut-card-blurb">{cut.blurb}</span>
            <span className="cut-card-length">{cutLengthLine(cut)}</span>
            <span className="cut-card-key">{i + 1}</span>
          </button>
        ))}
      </div>
      <p className="cut-chooser-hint">{cuts.map((_, i) => i + 1).join(" / ")} to choose</p>
    </div>
  );
}
