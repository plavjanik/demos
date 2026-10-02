/**
 * The opening title slide: a full-stage dark card, readable from the back of
 * a room, shown before the story touches anything else. Headline/subline
 * come from the `"title"`-scene step's own `titleScene` slice
 * (Step.titleScene, kit/engine/types.ts) — nothing else in the story
 * reuses them, so there's no reason for this scene to hold its own copy.
 */
import type { Step } from "../engine/types";
import "./TitleScene.css";

export function TitleScene({ step }: { step: Step }): React.JSX.Element {
  const title = step.titleScene;
  if (!title) return <div className="title-scene" />;
  return (
    <div className="title-scene">
      <div className="title-scene-inner">
        <h1 className="title-scene-headline">{title.headline}</h1>
        <p className="title-scene-subline">{title.subline}</p>
      </div>
      {/* data-keep-clear: NarrationCallout.tsx (bottom-right by default) lifts itself clear of this instead of covering it. */}
      {title.logoUrl && <img className="title-scene-logo" src={title.logoUrl} alt="" data-keep-clear="true" />}
    </div>
  );
}
