/**
 * The presenter-only toggles rendered by PresenterBar.tsx (every step):
 * narration visibility and review mode always, the spoken-narration voice
 * popover ONLY while review mode is on (it's the owner's own control, not
 * the audience's business — review round 11), and the settings popover
 * (today: the ATM recipient-name override — SettingsPopover.tsx). Classes
 * are fixed to the `pb-` prefix PresenterBar.css already styles
 * (pb-item/pb-narration-toggle/...) now that this is the only host;
 * StatusBar.tsx used to mount a second copy with its own `sb-` prefix,
 * removed on the owner's request (review round 6, "remove the narration
 * review voice from the VS Code status bar").
 */
import { useEffect, useState } from "react";
import { useStepEngine } from "../engine/StepEngine";
import { useAtmRecipient } from "../engine/atmRecipient";
import { VoicePopover } from "../vscode/VoicePopover";
import { SettingsPopover } from "../vscode/SettingsPopover";

export function PresenterControls(): React.JSX.Element {
  const { narrationVisible, toggleNarration, reviewMode, toggleReviewMode } = useStepEngine();
  const { recipient, overridden } = useAtmRecipient();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The toggle button itself is gone outside review mode (below), so a
  // popover left open from before "R" turned review mode off would have no
  // way to close — leaving voiceOpen true with nothing rendering it.
  useEffect(() => {
    if (!reviewMode) setVoiceOpen(false);
  }, [reviewMode]);
  return (
    <>
      <button type="button" className="pb-item pb-narration-toggle" onClick={toggleNarration}>
        {narrationVisible ? "◉" : "◯"} narration
      </button>
      <button
        type="button"
        className={`pb-item pb-review-toggle ${reviewMode ? "active" : ""}`}
        onClick={toggleReviewMode}
      >
        ✎ review
      </button>
      {reviewMode && (
        <button
          type="button"
          className={`pb-item pb-voice-toggle ${voiceOpen ? "active" : ""}`}
          onClick={() => setVoiceOpen((v) => !v)}
        >
          🔊 voice
        </button>
      )}
      {voiceOpen && <VoicePopover onClose={() => setVoiceOpen(false)} />}
      <button
        type="button"
        className={`pb-item pb-settings-toggle ${settingsOpen ? "active" : ""}`}
        onClick={() => setSettingsOpen((v) => !v)}
      >
        ⚙ settings{overridden ? ` · ${recipient}` : ""}
      </button>
      {settingsOpen && <SettingsPopover onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
