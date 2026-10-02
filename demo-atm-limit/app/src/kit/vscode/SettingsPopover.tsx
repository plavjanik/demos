/**
 * PresenterBar's "⚙ settings" item (kit/stage/PresenterControls.tsx) opens
 * this — one section today (Account Holder Name, the one editable fact on
 * the ATM face — engine/atmRecipient.tsx), in the same portalled-to-body
 * popover shell as VoicePopover.tsx (reusing its CSS classes,
 * VoicePopover.css) rather than forking that shell: still well under the
 * ~20-line bar for factoring out a shared one. Renamed from NamePopover
 * (review round 11) when the owner asked for a general "Settings" entry
 * point rather than a name-specific one — add the next presenter setting
 * here as a second `voice-field` section instead of a new popover.
 */
import { useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useAtmRecipient } from "../engine/atmRecipient";
import { useContent } from "../engine/content";
import { MAX_ATM_RECIPIENT_LENGTH } from "../engine/presenterSettings";
import "./VoicePopover.css";

export function SettingsPopover({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { recipient, setRecipient, reset, overridden } = useAtmRecipient();
  const content = useContent();
  const defaultRecipient = content.atm.recipient;
  const [value, setValue] = useState(recipient);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) setRecipient(trimmed);
    else setValue(recipient); // empty field reverts to whatever is current rather than clearing the ATM face
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return createPortal(
    <div className="voice-popover" role="dialog" aria-label="Settings">
      <div className="voice-popover-header">
        <span>⚙ Settings</span>
        <button type="button" className="voice-popover-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <label className="voice-field">
        <span>Account Holder Name</span>
        <input
          type="text"
          value={value}
          maxLength={MAX_ATM_RECIPIENT_LENGTH}
          placeholder={defaultRecipient}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        <span className="voice-field-note">Name on the ATM face</span>
      </label>

      {overridden && (
        <div className="voice-popover-footer">
          <button
            type="button"
            className="voice-btn-link"
            onClick={() => {
              reset();
              setValue(defaultRecipient);
            }}
          >
            reset to default
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
