/**
 * Top-level shell: wires a demo's own `steps`/`content` (src/demos/<name>)
 * into the kit's step engine and content provider, the fixed-aspect stage,
 * the scene switch, and the chrome that floats above every scene (presenter
 * bar, timer HUD, step rail, review panel). Generic over WHICH demo — see
 * main.tsx (DOGECICS) and main-techutex.tsx (Techutex), each of which
 * passes its own `steps`/`content` plus a `demoId` (kit/engine/StepEngine's
 * StepEngineProvider) so the two demos' review-mode localStorage notes
 * never collide.
 *
 * Code map: src/kit/** is the reusable presentation kit (engine, stage
 * chrome, and the five scene kinds — title/atm/vscode/process/compare);
 * src/demos/<name>/** is one story's own data (STEPS, CONTENT) and nothing
 * else in the tree may import it. A new demo is a new sibling of
 * src/demos/** wired in here the same way — see app/README.md.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { StepEngineProvider, useStepEngine } from "./kit/engine/StepEngine";
import { ContentProvider, useContent } from "./kit/engine/content";
import { NarrationAudioProvider } from "./kit/engine/narrationAudio";
import { AtmRecipientProvider } from "./kit/engine/atmRecipient";
import { Stage } from "./kit/stage/Stage";
import { PresenterBar } from "./kit/stage/PresenterBar";
import { TimerHud } from "./kit/stage/TimerHud";
import { StepRail } from "./kit/stage/StepRail";
import { NarrationCallout } from "./kit/stage/NarrationCallout";
import { ReviewPanel } from "./kit/stage/ReviewPanel";
import { TextEditOverlayGate } from "./kit/stage/TextEditOverlay";
import { AtmScene } from "./kit/atm/AtmScene";
import { VSCodeScene } from "./kit/vscode/VSCodeScene";
import { CompareScene } from "./kit/diagrams/CompareScene";
import { ProcessScene } from "./kit/diagrams/ProcessScene";
import { TitleScene } from "./kit/title/TitleScene";
import { CutChooser } from "./kit/stage/CutChooser";
import type { Cut } from "./kit/engine/cuts";
import type { Step, PresentationContent } from "./kit";

function SceneSwitch(): React.JSX.Element {
  const { step, instant } = useStepEngine();
  const transition = instant ? { duration: 0 } : { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        // One wrapper for every VS Code step: consecutive VS Code steps swap
        // their content in place with no fade or scale (the window is the
        // same window, only what happens inside it moved on). The scene
        // itself is still keyed per step below, so each step mounts fresh.
        key={step.scene === "vscode" ? "vscode" : step.id}
        initial={instant ? false : { opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={instant ? {} : { opacity: 0, scale: 1.01 }}
        transition={transition}
        style={{ width: "100%", height: "100%" }}
      >
        {step.scene === "title" && <TitleScene step={step} />}
        {step.scene === "atm" && <AtmScene step={step} />}
        {step.scene === "vscode" && <VSCodeScene key={step.id} step={step} />}
        {step.scene === "compare" && <CompareScene />}
        {step.scene === "process" && step.process && <ProcessScene data={step.process} instant={instant} />}
      </motion.div>
    </AnimatePresence>
  );
}

/** Nothing about review mode exists in the DOM while it's off — not a hidden panel, not an empty one. */
function ReviewPanelGate(): React.JSX.Element | null {
  const { reviewMode } = useStepEngine();
  return reviewMode ? <ReviewPanel /> : null;
}

/** Mounts the agent-loop timer HUD unless the demo's own content opts out (PresentationContent.timerHud === false) — see its doc comment. */
function TimerHudGate(): React.JSX.Element | null {
  const { timerHud } = useContent();
  return timerHud === false ? null : <TimerHud />;
}

/**
 * Which cut to show, or null for the chooser. `?cut=<id>` wins; a `#step-`
 * hash with no `?cut` is an old deep link and means the FIRST cut (Full),
 * with no chooser; otherwise the chooser.
 */
function initialCut(cuts: Cut[]): Cut | null {
  const wanted = new URLSearchParams(window.location.search).get("cut");
  const byId = cuts.find((c) => c.id === wanted);
  if (byId) return byId;
  if (window.location.hash.startsWith("#step-")) return cuts[0] ?? null;
  return null;
}

/** The page URL with `cut` removed and no hash; every other query param (review, instant, name...) is kept. */
function chooserUrl(): string {
  const params = new URLSearchParams(window.location.search);
  params.delete("cut");
  const query = params.toString();
  return window.location.pathname + (query ? `?${query}` : "");
}

function CutDemoApp({
  cuts,
  chooserHeadline,
  ...rest
}: Omit<DemoAppProps, "steps"> & { cuts: Cut[] }): React.JSX.Element {
  const [cut, setCut] = useState<Cut | null>(() => initialCut(cuts));

  if (!cut) {
    const select = (picked: Cut) => {
      const params = new URLSearchParams(window.location.search);
      params.set("cut", picked.id);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      setCut(picked);
    };
    return <CutChooser headline={chooserHeadline ?? ""} cuts={cuts} onSelect={select} />;
  }

  // The first cut (Full) keeps the demo's own storage prefix, so review
  // notes written before cuts existed stay readable; every other cut gets
  // its own, since a merged step's text is not the Full step's text.
  const demoId = cut === cuts[0] ? rest.demoId : `${rest.demoId ?? ""}-${cut.id}`;
  return (
    <DemoShell
      {...rest}
      demoId={demoId}
      steps={cut.steps}
      cutInfo={
        cuts.length > 1
          ? { cutId: cut.id, label: cut.label, onChange: () => window.location.assign(chooserUrl()) }
          : undefined
      }
    />
  );
}

interface DemoAppProps {
  steps: Step[];
  content: PresentationContent;
  demoId?: string;
  narrationId: string;
  /** Several cuts of the same story: the page opens on a chooser (see initialCut). Omitted: one cut, `steps`, no chooser. */
  cuts?: Cut[];
  /** Headline shown above the chooser's cards. */
  chooserHeadline?: string;
}

export function DemoApp({ cuts, chooserHeadline, ...rest }: DemoAppProps): React.JSX.Element {
  if (cuts && cuts.length > 0) return <CutDemoApp {...rest} cuts={cuts} chooserHeadline={chooserHeadline} />;
  return <DemoShell {...rest} />;
}

function DemoShell({
  steps,
  content,
  demoId,
  narrationId,
  cutInfo,
}: {
  steps: Step[];
  content: PresentationContent;
  /**
   * Prefixes this demo's review/narration localStorage keys
   * (StepEngineProvider) so two demos in the same browser profile never
   * share or clobber one another's presenter notes. DOGECICS passes
   * nothing, keeping its existing keys unchanged (main.tsx); a second demo
   * passes its own id (main-techutex.tsx).
   */
  demoId?: string;
  /**
   * The spoken-narration manifest-folder / settings-key id (kit/engine/
   * narrationAudio.tsx) — always a real string, unlike `demoId` above:
   * narration is a new feature with no legacy DOGECICS key to preserve, so
   * both demos pass their own actual name ("dogecics"/"techutex") here,
   * matching scripts/render-narration.mts's `--demo` and the
   * `public/narration/<name>/` folder it writes.
   */
  narrationId: string;
  /** The active cut when the demo has several; PresenterBar shows its label and a way back to the chooser. */
  cutInfo?: { cutId: string; label: string; onChange: () => void };
}): React.JSX.Element {
  return (
    <StepEngineProvider steps={steps} demoId={demoId} cutId={cutInfo?.cutId}>
      <NarrationAudioProvider narrationId={narrationId}>
        <ContentProvider content={content}>
          <AtmRecipientProvider demoId={demoId}>
            <Stage>
              <SceneSwitch />
            </Stage>
            <StepRail />
            <TimerHudGate />
            <NarrationCallout />
            <ReviewPanelGate />
            <TextEditOverlayGate />
            <PresenterBar cut={cutInfo} />
          </AtmRecipientProvider>
        </ContentProvider>
      </NarrationAudioProvider>
    </StepEngineProvider>
  );
}
