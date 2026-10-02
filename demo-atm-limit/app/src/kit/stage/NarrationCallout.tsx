/**
 * The presenter's spoken-cue callout — a first draft of what to SAY on
 * this step, not something the audience is meant to read as UI copy.
 * Anchored bottom-right (or left, `narrationSide`) of the stage, above the
 * presenter bar, OR a full-width band above the whole stage (`"top"`) —
 * hidden globally by the status bar's "◉ narration" toggle (StatusBar.tsx),
 * which persists in localStorage via StepEngine.
 *
 * Renders `text` (the shipped narration OR a review-mode edit —
 * effectiveText() doesn't care which) through the kit's own MarkdownLite
 * (kit/vscode/markdownLite.tsx): paragraphs on blank lines, `**bold**`,
 * `` `code` ``, lists, headings — the same tiny renderer the chat panel's
 * assistant prose already uses. ReviewPanel.tsx's own textarea stays plain
 * text (it edits the Markdown SOURCE, not a preview of it). The lift
 * measurement below reads the callout's rendered box as a whole, so a
 * multi-paragraph narration's taller box is measured correctly with no
 * change needed there.
 *
 * Collision avoidance for "left"/"right" is a GENERIC rule, not a per-step
 * position nudge: any element on the page carrying `data-keep-clear` (each
 * component-strip box in kit/diagrams/ComponentsStrip.tsx, each
 * process-diagram node in kit/diagrams/ProcessScene.tsx) is measured after
 * paint, and the callout's default bottom-right/left slot lifts straight
 * up clear of any it overlaps,
 * iterating since clearing one element in a stack can land on the next one
 * up. A scene that adds a new data-keep-clear element is covered
 * automatically; nothing here names a step or a scene. Marking individual
 * elements rather than a whole section matters: a tall section (a
 * diagram's full node column) marked as one region would force a lift
 * clear over its top, off-screen — per-box/per-node keeps the lift to only
 * what's actually in the way.
 *
 * "top" does not use that lift at all — it can't be made to work for a
 * lane packed with no gap tall enough to ever find real clear space (tried
 * "left", tried a lift against per-node data-keep-clear, both reverted —
 * see kit/diagrams/ProcessScene.tsx). Stage.tsx reserves real screen pixels for it
 * instead (`--narration-top-height`, the same mechanism
 * `--presenter-bar-height` already uses below), so the scaled scene is fit
 * into the remaining box: a reserved region, not a measured one, so it
 * cannot overlap scene content at ANY size.
 *
 * Review mode (ReviewPanel.tsx) docks a ~360px panel on the right, real
 * screen pixels, OUTSIDE the scaled stage — which a `"right"`-side callout
 * would otherwise render straight underneath (both are viewport-fixed, and
 * the panel is on top by z-index), defeating "edit it live and watch the
 * callout change". `--narration-review-shift` pushes `.narration-right`
 * clear of the panel the same way `--narration-lift` pushes it clear of a
 * `data-keep-clear` box — a second, independent CSS var on the other axis,
 * not a rework of the lift itself. `"left"` needs no shift (panel is on
 * the other side); `"top"` pulls its own RIGHT EDGE in with
 * `--narration-top-review-shift` instead of shifting position — the first
 * version left the band spanning the full viewport, so its centered
 * sentence ran under the panel and was genuinely clipped, not just a
 * chrome-on-chrome overlap. Its pencil sits on the LEFT for the same
 * reason (a right-corner pencil would end up under the panel too).
 */
import { useLayoutEffect, useRef, useState } from "react";
import { useStepEngine } from "../engine/StepEngine";
import { effectiveText } from "../engine/reviewData";
import { useNarrationAudio, type NarrationField } from "../engine/narrationAudio";
import type { Step } from "../engine/types";
import { MarkdownLite } from "../vscode/markdownLite";
import { REVIEW_NARRATION_FIELD_ID, REVIEW_NARRATION_AFTER_FIELD_ID } from "./ReviewPanel";
import "./NarrationCallout.css";

/**
 * ▶ / ■ / a spinner while the clip loads / a muted glyph once both the
 * rendered file and its live fallback have failed — nothing renders at all
 * while narration audio is off (kit/vscode/StatusBar.tsx's own "🔊 voice"
 * popover is where a presenter turns it on). `isActive` is keyed by
 * step+field rather than just "is anything playing", so a button never
 * shows another step's spinner mid-transition.
 */
function NarrationSpeakerButton({ step, field }: { step: Step; field: NarrationField }): React.JSX.Element | null {
  const { settings, isActive, status, play, stop } = useNarrationAudio();
  if (settings.mode === "off") return null;
  const effectiveStatus = isActive(step.id, field) ? status : "idle";
  const label =
    effectiveStatus === "playing"
      ? "Stop narration"
      : effectiveStatus === "loading"
        ? "Loading narration…"
        : effectiveStatus === "not-rendered"
          ? "Narration not rendered — click to try live"
          : effectiveStatus === "error"
            ? "Narration failed — click to retry"
            : "Play narration";
  const glyph =
    effectiveStatus === "playing"
      ? "■"
      : effectiveStatus === "loading"
        ? "◐"
        : effectiveStatus === "not-rendered" || effectiveStatus === "error"
          ? "🔇"
          : "▶";
  return (
    <button
      type="button"
      className={`narration-speaker narration-speaker-${effectiveStatus}`}
      aria-label={label}
      title={label}
      onClick={() => (effectiveStatus === "playing" ? stop() : play(step, field))}
    >
      {glyph}
    </button>
  );
}

export function NarrationCallout(): React.JSX.Element | null {
  const { step, narrationVisible, hotspotFired, reviewMode, reviewData } = useStepEngine();
  const ref = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  // The top band publishes its own rendered height so Stage.css reserves
  // exactly that much (global.css's value is only the minimum); on leaving a
  // top-band step the override is removed and the default applies again.
  useLayoutEffect(() => {
    const el = topRef.current;
    const root = document.documentElement;
    if (!el) {
      root.style.removeProperty("--narration-top-height");
      return;
    }
    const publish = () =>
      root.style.setProperty("--narration-top-height", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--narration-top-height");
    };
  });
  const [liftPx, setLiftPx] = useState(0);

  // `narrationAfter` (e.g. the ATM step's second line, once the confirm has
  // fired) replaces `narration` on the SAME step rather than stacking with
  // it — see Step.narrationAfter in kit/engine/types.ts. Review mode's own edit
  // (reviewData.ts, keyed by step id) overrides the shipped text either
  // way — effectiveText() is the one place that decides which wins.
  const showingAfter = !!step.narrationAfter && hotspotFired;
  const field = showingAfter ? "narrationAfter" : "narration";
  const text = effectiveText(step, reviewData, field);
  const side = step.narrationSide ?? "right";
  const lifts = side === "left" || side === "right";
  const editFieldId = showingAfter ? REVIEW_NARRATION_AFTER_FIELD_ID : REVIEW_NARRATION_FIELD_ID;

  useLayoutEffect(() => {
    if (!narrationVisible || !text || !lifts) {
      setLiftPx(0);
      return;
    }
    // ResizeObserver instance is created before `measure` so `measure` can
    // re-subscribe it to whatever `[data-keep-clear]` elements currently
    // exist every time it runs — see the re-subscription at the end of
    // `measure` below.
    const ro = new ResizeObserver(() => measure());

    function measure() {
      const el = ref.current;
      if (!el) return;
      // Read the callout's own box at its base (unlifted) position: reset
      // any prior lift first, since a stale lift from a previous step/size
      // would otherwise feed back into this measurement. NarrationCallout
      // .css puts a 0.15s `transition` on the `bottom` property `
      // --narration-lift` feeds — resetting it while that transition is
      // live doesn't move the box instantly, it starts a NEW 150ms
      // animation toward 0, and getBoundingClientRect() below would read
      // an interpolated mid-transition position instead of the settled
      // one (measured: repeated re-triggers here converged on a bogus
      // ~half-lift, never the correct clear distance). Suspending the
      // transition for the duration of this function, forcing a layout
      // flush on each side of the reset+final write, makes every read see
      // the CSS box model's instantaneous target value, exactly like the
      // transition were never there.
      const prevTransition = el.style.transition;
      el.style.transition = "none";
      el.style.setProperty("--narration-lift", "0px");
      void el.offsetHeight; // flush: force layout to apply the reset before measuring
      const baseRect = el.getBoundingClientRect();
      const keepClear = Array.from(document.querySelectorAll<HTMLElement>("[data-keep-clear]"));

      // One pass only clears whatever the UNLIFTED box overlaps — clearing
      // that can put the box on top of the NEXT keep-clear element further
      // up a stack (e.g. one node in a diagram's node column after
      // another). Iterate until a pass finds nothing new to clear, capped
      // so a pathological stack can't loop forever.
      let lift = 0;
      for (let pass = 0; pass < 12; pass++) {
        const top = baseRect.top - lift;
        const bottom = baseRect.bottom - lift;
        let nextLift = lift;
        for (const node of keepClear) {
          const r = node.getBoundingClientRect();
          const overlapsHorizontally = baseRect.left < r.right && baseRect.right > r.left;
          const overlapsVertically = top < r.bottom && bottom > r.top;
          if (overlapsHorizontally && overlapsVertically) {
            nextLift = Math.max(nextLift, lift + (bottom - r.top) + 16);
          }
        }
        if (nextLift === lift) break;
        lift = nextLift;
      }
      // Never push the callout above the viewport (a stack taller than the
      // screen would otherwise send it off — better to sit as high as
      // possible and still overlap slightly than to vanish entirely).
      lift = Math.min(lift, Math.max(0, baseRect.top - 16));
      // Write the result straight to the DOM, not only through setLiftPx:
      // with several observers below all re-triggering measure() as the
      // scene settles, two consecutive calls often compute the SAME lift
      // (nothing actually changed) — React bails out of re-rendering on an
      // unchanged state value, so it never re-applies the style, and the
      // element is left holding whatever this function's OWN reset-to-0px
      // line above last wrote. Setting it here makes every measure() call
      // leave the DOM correct regardless of whether React re-renders; the
      // transition is still suspended, so this write also lands instantly
      // (a later, genuinely new value set through React's own re-render —
      // e.g. the step changing — restores the transition first and still
      // animates normally).
      el.style.setProperty("--narration-lift", lift > 0 ? `${lift}px` : "0px");
      void el.offsetHeight; // flush the final value before transitions resume
      el.style.transition = prevTransition;
      setLiftPx(lift);

      // Re-subscribe to whatever keep-clear elements exist NOW — a box
      // that mounted (or resized) after the last measure() needs its own
      // future resizes watched too.
      ro.disconnect();
      for (const node of keepClear) ro.observe(node);
    }
    measure();

    // This effect's OWN dependency array fires the instant `step.id`
    // changes — with SceneSwitch's `AnimatePresence mode="wait"`
    // (App.tsx), that is BEFORE the new scene has actually mounted: the
    // OUTGOING scene is still playing its ~280ms exit animation, so this
    // first measure() sees either no [data-keep-clear] boxes at all or the
    // previous step's. A MutationObserver on the stage's own DOM (not the
    // whole document — that would also see THIS component's own
    // `--narration-lift` style write on every measure() and loop) re-runs
    // measure() when the new scene mounts (a childList change) and while
    // its entry animation is still settling (SceneSwitch's motion.div
    // mutates its own `style` every animation frame, which this observer's
    // `subtree: true` also sees). The ResizeObserver above catches a keep-
    // clear box resizing later with no attribute mutation of its own (e.g.
    // reflowing after `document.fonts.ready`, covered below too).
    const stageRoot = document.querySelector<HTMLElement>(".stage-inner");
    const mo = stageRoot ? new MutationObserver(() => measure()) : null;
    mo?.observe(stageRoot!, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });

    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      mo?.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // reviewMode is a dependency because toggling it moves a "right" callout
    // horizontally (narration-review-shift below) — a different box in the
    // row underneath can end up below it, needing a different vertical lift.
  }, [narrationVisible, text, lifts, step.id, reviewMode]);

  if (!narrationVisible || !text) return null;

  // Focuses the panel's own textarea for whichever field is showing right
  // now — the panel is already open and already on this step (review mode
  // is what made this pencil exist in the first place), so there's no
  // step/field to pass, just a DOM id to jump to.
  const pencil = reviewMode && (
    <button
      type="button"
      className="narration-edit-pencil"
      aria-label="Edit this narration"
      onClick={() => document.getElementById(editFieldId)?.focus()}
    >
      ✎
    </button>
  );

  if (side === "top") {
    const topStyle: Record<string, string> = {};
    if (reviewMode) topStyle["--narration-top-review-shift"] = "var(--review-panel-width)";
    return (
      <div ref={topRef} className="narration-callout narration-top" style={topStyle as React.CSSProperties}>
        <NarrationSpeakerButton step={step} field={field} />
        <MarkdownLite text={text} />
        {pencil}
      </div>
    );
  }

  const style: Record<string, string> = {};
  if (liftPx > 0) style["--narration-lift"] = `${liftPx}px`;
  if (reviewMode && side === "right") style["--narration-review-shift"] = "var(--review-panel-width)";

  return (
    <div ref={ref} className={`narration-callout narration-${side}`} style={style as React.CSSProperties}>
      <NarrationSpeakerButton step={step} field={field} />
      <MarkdownLite text={text} />
      {pencil}
    </div>
  );
}
