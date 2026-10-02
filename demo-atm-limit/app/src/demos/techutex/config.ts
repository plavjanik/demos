/**
 * Techutex Banking / DOT500 facts — the single place a re-seed, a renamed
 * account or a changed limit gets edited once. Read only by this demo's
 * own content.ts/steps.ts; the kit itself (src/kit/**) never imports this
 * module — see kit/atm/skins.ts and kit/atm/AtmMachine.tsx, which take
 * these facts as props instead.
 */
import logoUrl from "../../../../../demo-techutex-limit/brand/broadcom-mainframe-software.png";
import type { AtmBrand } from "../../kit/engine/content";

/**
 * owner's decision: fictional holder/amounts on the ATM face; the host
 * screens and test outputs stay real. The 3270 captures behind these two
 * ATM steps (screens/02-04) show the REAL run's own $50.00 debit on the
 * REAL accounts (901123456 / 101123456) — steps.ts's `screenNote` says so
 * on both steps, verbatim.
 */
export const DEMO_BALANCE = "500,000.00";
export const DEMO_RECIPIENT = "NAMIK HRLE";
/** The ATM's own debit amount (fictional) — NOT the real $50.00 the HB.js tests/host screens used; those stay hardcoded in steps.ts's Bash commands and screenNote text. */
export const DEMO_DEBIT_AMOUNT = "200000.00";

export const DEMO_CURRENCY = "USD";
export const DEMO_CURRENCY_SYMBOL = "$";

/** The ticket's own limit — session/prompt.md / FACTS.md's "configured $5,000.00 ceiling" (FACTS.md's own wording, quoted as-is). Unrelated to the ATM's own (fictional) balance/debit above — this is the real COBOL rule. */
export const DAILY_LIMIT = 5000;

export const DEMO_ATM_BRAND: AtmBrand = {
  small: "TECHUTEX BANKING",
  big: "ATM",
  unit: "DOT5",
  logoUrl,
};
