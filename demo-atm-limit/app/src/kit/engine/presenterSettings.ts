/**
 * The ATM recipient-name override: the one presenter-editable fact on the
 * ATM face (engine/atmRecipient.tsx wraps these as a context; AtmScene.tsx
 * reads it instead of content.atm.recipient directly), persisted per demo
 * in localStorage under key `${keyPrefix}atm-recipient` — the same
 * per-demoId prefixing StepEngine.tsx uses for its own narration-visible/
 * review-mode keys, so DOGECICS and Techutex never share one override in
 * the same browser profile. A `?name=` URL parameter is a one-shot
 * override for this page load only, same semantics as narrationSettings.ts's
 * `?voice=`: it does not persist until the presenter commits something in
 * the popover (NamePopover.tsx's Enter/blur, or "reset to default").
 */

const RECIPIENT_KEY = "atm-recipient";

/** The popover's input `maxLength` and the cap applied to a `?name=` value. */
export const MAX_ATM_RECIPIENT_LENGTH = 24;

export function readAtmRecipientOverride(keyPrefix: string): string | null {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(keyPrefix + RECIPIENT_KEY);
  } catch {
    // private window / storage blocked — no stored override
  }
  return applyUrlOverride(stored);
}

function applyUrlOverride(stored: string | null): string | null {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  if (name) return name.slice(0, MAX_ATM_RECIPIENT_LENGTH);
  return stored;
}

export function writeAtmRecipientOverride(keyPrefix: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(keyPrefix + RECIPIENT_KEY);
    else window.localStorage.setItem(keyPrefix + RECIPIENT_KEY, value);
  } catch {
    // ignore — nothing to persist it in this session
  }
}
