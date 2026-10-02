/**
 * DOGECICS/Doge ATM facts — the single place a host re-seed (a new
 * balance), a renamed recipient, or a changed daily limit gets edited
 * once. Read only by this demo's own content.ts/steps.ts; the kit itself
 * (src/kit/**) never imports this module — see kit/atm/skins.ts and
 * kit/atm/AtmMachine.tsx, which take these facts as props instead.
 */
import type { AtmBrand } from "../../kit/engine/content";

/** The ATM's own display (2 decimals) — re-seeded 2026-09-25. The captured host screen shows the host's full "200,050.00000000" verbatim in its own SVG/text capture, untouched here (that's a real screen, not UI text this app renders). */
export const DEMO_BALANCE = "200,050.00";

/** atm/atm.ts's ATM_RECIPIENT default (DEFAULT_TO_ADDRESS) — what DOGESEND actually pays out to. */
export const DEMO_RECIPIENT = "Petr Plavjanik";

export const DEMO_CURRENCY = "DOGE";
/** Banknote watermark/face glyph — the actual Dogecoin currency symbol, distinct from the ticker "DOGE". */
export const DEMO_CURRENCY_SYMBOL = "Ð";

/** The hard-coded daily limit DOGESEND enforces (DOGE). A configurable limit is a follow-up ticket, not this one. */
export const DAILY_LIMIT = 10000;

/** kit/atm/skins.ts's AtmBrand — every word a skin's wordmark/header title can show, for this demo's own ATM. */
export const DEMO_ATM_BRAND: AtmBrand = {
  small: "Doge Bank",
  big: "Doge ATM",
  unit: "0042",
};
