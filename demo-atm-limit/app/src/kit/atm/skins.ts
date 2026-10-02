/**
 * ATM presentation, separated from the ATM's data: AtmMachine.tsx's markup
 * never changes between skins — every skin is a label set plus a CSS class
 * that sets colour/font/radius as custom properties (AtmScene.css). The
 * raw host message (`step.atm.message`) always drives `accepted`/`refused`;
 * a skin just chooses how to word it, and the raw text still shows up in
 * a small monospace footer for skins that reword it, so the demo never
 * shows something the host didn't actually say.
 *
 * Every word a skin actually prints comes from `AtmBrand` (kit/engine
 * /content.ts's `content.atm.brand`) or is a generic, demo-agnostic literal
 * ("ATM", "Balance", …) — a skin chooses layout/casing/decoration around
 * the brand, never invents its own brand name.
 */
import type { AtmBrand } from "../engine/content";

export interface AtmSkinLabels {
  title: (brand: AtmBrand) => string;
  balance: string;
  payTo: string;
  amount: string;
  accepted: (hostMessage: string) => string;
  refused: (hostMessage: string) => string;
  /** The big fascia wordmark every skin shows above the screen, so the machine reads as an ATM at a glance — `small` is an optional line over the big one. */
  wordmark: (brand: AtmBrand) => { small?: string; big: string };
}

export interface AtmSkin {
  id: string;
  name: string;
  labels: AtmSkinLabels;
  className: string;
  /** Shown under the status line as "host: <message>" — skins that reword the host text keep it truthful; the raw skin shows it inline already, so it opts out. */
  showHostFooter: boolean;
}

export const ATM_SKINS: Record<string, AtmSkin> = {
  doge: {
    id: "doge",
    name: "Doge ATM",
    className: "atm-skin-doge",
    showHostFooter: false,
    labels: {
      // Identical to this skin's own wordmark below — AtmMachine.tsx drops
      // the header line for this one skin so the two don't repeat.
      title: (brand) => brand.big.toUpperCase(),
      balance: "Available",
      payTo: "pay to",
      amount: "amount",
      accepted: (msg) => msg,
      refused: (msg) => msg,
      wordmark: (brand) => ({ big: brand.big.toUpperCase() }),
    },
  },
  bank: {
    id: "bank",
    name: "Bank ATM",
    className: "atm-skin-bank",
    showHostFooter: true,
    labels: {
      title: (brand) => `No. ${brand.unit ?? "0000"}`,
      balance: "Balance",
      payTo: "Recipient",
      amount: "Withdrawal amount",
      accepted: () => "TRANSACTION AUTHORISED",
      // The host's own footer line (showHostFooter above) carries the real
      // reason — a generic refusal here never invents wording the host
      // itself didn't say (a demo-specific limit figure used to be baked
      // into this string; that's the host's message to show, not this
      // skin's to compose).
      refused: () => "TRANSACTION DECLINED",
      wordmark: (brand) => ({ small: brand.small?.toUpperCase(), big: "ATM" }),
    },
  },
  terminal: {
    id: "terminal",
    name: "Touchscreen ATM",
    className: "atm-skin-terminal",
    showHostFooter: true,
    labels: {
      title: (brand) => brand.small ?? brand.big,
      balance: "Available balance",
      payTo: "To",
      amount: "Amount",
      accepted: () => "Payment sent",
      refused: () => "Daily limit reached",
      // Ignores `small` — this skin's single-line header has no room for it.
      wordmark: () => ({ big: "ATM" }),
    },
  },
};

export const DEFAULT_ATM_SKIN = "bank";

export function resolveAtmSkin(id: string | undefined | null): AtmSkin {
  if (id && ATM_SKINS[id]) return ATM_SKINS[id]!;
  return ATM_SKINS[DEFAULT_ATM_SKIN]!;
}

const STORAGE_KEY = "demo-atm-skin";

/** ?atm= query param wins; else the last skin remembered in localStorage; else the default. Both reads are wrapped — a private window or blocked storage must never crash the app. */
export function readAtmSkinPreference(): string {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("atm");
    if (fromQuery && ATM_SKINS[fromQuery]) {
      writeAtmSkinPreference(fromQuery);
      return fromQuery;
    }
  } catch {
    // ignore
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && ATM_SKINS[stored]) return stored;
  } catch {
    // private window / storage blocked — fall through to the default
  }
  return DEFAULT_ATM_SKIN;
}

export function writeAtmSkinPreference(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore — nothing to remember it in, the query param still worked this load
  }
}
