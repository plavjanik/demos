/**
 * The presenter-editable ATM recipient name as a context: AtmScene.tsx
 * reads it via useAtmRecipient() instead of content.atm.recipient
 * directly, so an override set in PresenterControls' "👤 name" popover
 * (NamePopover.tsx) reaches every ATM step (before-accepted, after-refused)
 * without either one holding its own notion of the name. One provider per
 * demo, mounted in DemoApp.tsx inside <ContentProvider> — it reads the
 * demo's own default from useContent() — and above everything that needs
 * it (SceneSwitch, PresenterBar).
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useContent } from "./content";
import { MAX_ATM_RECIPIENT_LENGTH, readAtmRecipientOverride, writeAtmRecipientOverride } from "./presenterSettings";

export interface AtmRecipientApi {
  recipient: string;
  setRecipient: (value: string) => void;
  reset: () => void;
  /** True when the shown name differs from the demo's own content default — drives the presenter-bar button's "👤 NAME" vs plain "👤 name" label. */
  overridden: boolean;
}

const AtmRecipientContext = createContext<AtmRecipientApi | null>(null);

export function AtmRecipientProvider({
  demoId = "",
  children,
}: {
  /** Same per-demo key prefix as StepEngineProvider's own `demoId` — DOGECICS passes nothing, Techutex passes "techutex". */
  demoId?: string;
  children: ReactNode;
}): React.JSX.Element {
  const content = useContent();
  const defaultRecipient = content.atm.recipient;
  const keyPrefix = demoId ? `${demoId}-` : "";

  const [recipient, setRecipientState] = useState<string>(
    () => readAtmRecipientOverride(keyPrefix) ?? defaultRecipient,
  );

  const setRecipient = useCallback(
    (value: string) => {
      const trimmed = value.trim().slice(0, MAX_ATM_RECIPIENT_LENGTH);
      if (!trimmed) return;
      setRecipientState(trimmed);
      writeAtmRecipientOverride(keyPrefix, trimmed);
    },
    [keyPrefix],
  );

  const reset = useCallback(() => {
    setRecipientState(defaultRecipient);
    writeAtmRecipientOverride(keyPrefix, null);
  }, [keyPrefix, defaultRecipient]);

  const value = useMemo<AtmRecipientApi>(
    () => ({ recipient, setRecipient, reset, overridden: recipient !== defaultRecipient }),
    [recipient, setRecipient, reset, defaultRecipient],
  );

  return <AtmRecipientContext.Provider value={value}>{children}</AtmRecipientContext.Provider>;
}

export function useAtmRecipient(): AtmRecipientApi {
  const ctx = useContext(AtmRecipientContext);
  if (!ctx) throw new Error("useAtmRecipient() outside <AtmRecipientProvider>");
  return ctx;
}
