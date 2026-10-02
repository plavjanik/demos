/**
 * Wires the ATM machine visual (AtmMachine.tsx) into the story: the
 * click/advance hotspot, the packet-round-trip reveal gate, the captured
 * screen reveal panel and the component strip. Skin choice (skins.ts) is
 * resolved once per mount from the step's own override or the session's
 * ?atm=/localStorage preference; balance/recipient/currency/brand and the
 * captured screens/component boxes come from the demo's own content
 * (useContent()), never imported directly.
 */
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { useStepEngine } from "../engine/StepEngine";
import { useContent } from "../engine/content";
import { useAtmRecipient } from "../engine/atmRecipient";
import { Hotspot } from "../stage/Hotspot";
import { toResponsiveSvg } from "./svg";
import { ComponentsStrip } from "../diagrams/ComponentsStrip";
import { AtmMachine } from "./AtmMachine";
import { readAtmSkinPreference, resolveAtmSkin } from "./skins";
import type { Step } from "../engine/types";
import "./AtmScene.css";

export function AtmScene({ step }: { step: Step }): React.JSX.Element {
  const { instant } = useStepEngine();
  const content = useContent();
  const { recipient } = useAtmRecipient();
  const atm = step.atm ?? {};
  const result = atm.result ?? "idle";
  const amount = atm.amount ?? "";

  const [globalSkinId] = useState(() => readAtmSkinPreference());
  const skin = resolveAtmSkin(atm.skin ?? globalSkinId);

  const holdForPacket = !!atm.holdForPacket && !instant;
  const [phase, setPhase] = useState<"idle" | "sending" | "done">(holdForPacket ? "idle" : "done");
  const resolveSendRef = useRef<(() => void) | null>(null);

  const revealed = phase === "done";
  // The captured-screen panel can be visible from the START of the step
  // (a host's main menu, before any send) and swap to the result screen on
  // reveal — the same `revealed` gate as the ATM's own banner/cash-out, so
  // both flip together (AtmMachine.tsx's own hard invariant covers the ATM
  // side).
  const svgKey = revealed ? atm.screenSvg : (atm.screenSvgIdle ?? atm.screenSvg);
  const svg = svgKey ? content.screens[svgKey] : undefined;

  const effectiveDiagram = holdForPacket
    ? { ...step.diagram, packet: phase === "sending" ? ("round-trip" as const) : ("none" as const) }
    : step.diagram;

  const handleConfirmActivate = holdForPacket
    ? () =>
        new Promise<void>((resolve) => {
          resolveSendRef.current = resolve;
          setPhase("sending");
        })
    : undefined;

  const handlePacketReturn = () => {
    setPhase("done");
    resolveSendRef.current?.();
    resolveSendRef.current = null;
  };

  const atmMachine = (
    <AtmMachine
      skin={skin}
      amount={amount}
      result={result}
      message={atm.message}
      instant={instant}
      revealed={revealed}
      balance={content.atm.balance}
      recipient={recipient}
      currency={content.atm.currency}
      currencySymbol={content.atm.currencySymbol}
      brand={content.atm.brand}
      recipientLabel={content.atm.recipientLabel}
      confirmCue={revealed ? undefined : step.hotspot?.label}
    />
  );

  return (
    <div className="atm-scene">
      <div className={`atm-layout ${atm.showThreeTwoSeventy ? "split" : ""}`}>
        <div className="atm-machine-wrap">
          {/* Once revealed, this hotspot has done its one job — dropping
              the wrapper (rather than just disabling it) stops a stray
              click from re-firing handleConfirmActivate and re-running the
              packet animation, and stops the pulsing ring from suggesting
              there's still something to click here. */}
          {revealed ? (
            atmMachine
          ) : (
            <Hotspot
              id="atm-confirm"
              className="atm-machine-hotspot"
              onActivate={handleConfirmActivate}
              // Reveal in place; the presenter moves on with a plain
              // keypress (the presenter bar's "→ next" cue) once they're
              // ready, not the instant the reveal animation finishes.
              advanceOnActivate={!holdForPacket}
              // Petr: "It is not clear that the presenter should press the
              // green button" — a small label floating above the whole
              // machine (the default "top" placement) was easy to miss, and
              // an outside-the-machine arrow (tried, then dropped) pointed
              // at nowhere in particular since this hotspot wraps the whole
              // fascia. The cue now sits at the ✓ button itself, inside the
              // face (AtmMachine's `confirmCue` prop above), so this
              // wrapper's own label is redundant.
              labelPlacement="none"
            >
              {atmMachine}
            </Hotspot>
          )}
        </div>

        {atm.showThreeTwoSeventy && (
          <motion.div
            className="atm-3270-panel"
            initial={instant ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: instant ? 0 : 0.3 }}
          >
            <div className="atm-3270-caption">{content.atm.screenCaption ?? "what the mainframe actually showed"}</div>
            <div className="atm-3270-svg-box">
              {svg ? (
                <div className="atm-3270-svg" dangerouslySetInnerHTML={{ __html: toResponsiveSvg(svg) }} />
              ) : (
                <div className="atm-3270-missing">no capture for {svgKey}</div>
              )}
            </div>
            {atm.screenNote && (
              <div className="atm-3270-note" data-keep-clear="true">
                {atm.screenNote}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Each box inside carries data-keep-clear (ComponentsStrip.tsx) —
          NarrationCallout.tsx lifts itself clear of any box it would
          otherwise cover. A generic rule, not a per-step position nudge. */}
      <div className="atm-diagram-strip-wrap">
        <ComponentsStrip
          boxes={content.components}
          diagram={effectiveDiagram}
          instant={instant}
          onPacketReturn={handlePacketReturn}
        />
      </div>
    </div>
  );
}
