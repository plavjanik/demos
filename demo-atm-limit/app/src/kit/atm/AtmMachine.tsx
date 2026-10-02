/**
 * The ATM machine's visual: every element any skin (skins.ts) needs — LED,
 * receipt slot, the bank's three coloured action keys, the touchscreen's
 * quick-amount tiles and bottom bar — is always in the DOM, shown or
 * hidden purely by the active skin's own CSS class (AtmScene.css).
 * Deliberately has no dependency on the step engine or Hotspot, so it can
 * be dropped into a plain page (bench.tsx) as well as the real story
 * (AtmScene.tsx, which wraps this in the click/advance machinery). Takes
 * every demo fact (balance, recipient, currency, brand) as a prop — no
 * import of any one demo's own config.
 */
import { motion } from "motion/react";
import type { AtmSkin } from "./skins";
import type { AtmBrand } from "../engine/content";
import "./AtmScene.css";

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
];
const QUICK_TILES = ["100", "500", "1,000", "Other"];
/** Slight fan angles for the 3-note stack, back note first. */
const NOTE_ROTATIONS = [-7, 0, 7];

/** "50000" -> "50 000 <symbol>" — a banknote shows a symbol, not the spelled-out currency. */
function formatNoteAmount(amount: string, currencySymbol: string): string {
  const grouped = amount.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} ${currencySymbol}`;
}

function AmountDigits({ amount, instant }: { amount: string; instant: boolean }): React.JSX.Element {
  // instant mode renders plain, un-animated spans — no motion element at
  // all, so there is no chance of a mid-flight transform (measured: even
  // `initial={false}` could still leave one span's rect a few px off its
  // neighbours on first paint).
  if (instant) {
    return (
      <span className="atm-amount-digits">
        {amount.split("").map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </span>
    );
  }
  return (
    <span className="atm-amount-digits">
      {amount.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.15 }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * The balance the screen shows once a withdrawal is authorised: the ATM's
 * OWN arithmetic (start balance minus the amount), not a host figure — a
 * host that only writes a spool record and never debits its own ledger can
 * leave its captured "after" screen reading the pre-withdrawal balance.
 * Both strings are plain decimals with optional thousands separators.
 */
export function balanceAfter(balance: string, amount: string): string {
  const cents = (v: string) => Math.round(Number(v.replace(/,/g, "")) * 100);
  const remaining = cents(balance) - cents(amount);
  const whole = Math.trunc(remaining / 100);
  const frac = Math.abs(remaining % 100);
  return `${whole.toLocaleString("en-US")}.${String(frac).padStart(2, "0")}`;
}

export interface AtmMachineProps {
  skin: AtmSkin;
  amount: string;
  result: "idle" | "typing" | "accepted" | "refused";
  /** Raw host message; defaults to the synthesised "SENDING <amount> <currency>" when accepted. */
  message?: string;
  instant: boolean;
  /** False holds the banner/cash-out back (AtmScene's packet round-trip gate) — always true on the bench page. */
  revealed?: boolean;
  balance: string;
  recipient: string;
  currency: string;
  /** Glyph shown on the banknote watermark/face — defaults to `currency` itself when the demo has no dedicated symbol. */
  currencySymbol?: string;
  brand: AtmBrand;
  /** Overrides the skin's own "pay to"/"Recipient"/"To" label — content.atm.recipientLabel (e.g. Techutex's "Account"); omit to keep the skin's default. */
  recipientLabel?: string;
  /** "Press the button" cue rendered INSIDE the ATM face, immediately right of and vertically centred on the ✓ key — replaces Hotspot's old floating "arrow" label (Hotspot.tsx), which sat outside the whole machine and pointed at nothing in particular. Set only while the hotspot is still active (AtmScene's `!revealed` gate); omit once pressed. */
  confirmCue?: string;
}

export function AtmMachine({
  skin,
  amount,
  result,
  message,
  instant,
  revealed = true,
  balance,
  recipient,
  currency,
  currencySymbol,
  brand,
  recipientLabel,
  confirmCue,
}: AtmMachineProps): React.JSX.Element {
  const accepted = result === "accepted";
  const refused = result === "refused";
  const symbol = currencySymbol ?? currency;
  // Hard invariant (Petr): the cash-out — banknotes, or the terminal skin's
  // receipt ticket — exists in the DOM ONLY once the withdrawal is actually
  // authorised, i.e. accepted AND revealed (revealed is false until
  // AtmScene's packet round-trip returns; instant mode has no round-trip,
  // so revealed defaults true there and this collapses to `accepted`).
  // Never conditionally render the notes/ticket on `accepted` alone.
  const showCashOut = accepted && revealed;
  const shownBalance = showCashOut ? balanceAfter(balance, amount) : balance;
  const rawMessage = message ?? (accepted ? `SENDING ${amount} ${currency}` : "");
  const displayMessage = accepted
    ? skin.labels.accepted(rawMessage)
    : refused
      ? skin.labels.refused(rawMessage)
      : rawMessage;
  const wordmark = skin.labels.wordmark(brand);

  return (
    <div className={`atm-machine ${skin.className}`}>
      {/* Reads as an ATM before anything else on the fascia does — every
          skin shows this, sized well above the header title line below it
          (AtmScene.css hides that line for the one skin whose text it
          exactly repeats). */}
      <div className="atm-wordmark">
        {brand.logoUrl && <img className="atm-wordmark-logo" src={brand.logoUrl} alt="" />}
        {wordmark.small && <div className="atm-wordmark-small">{wordmark.small}</div>}
        <div className="atm-wordmark-big">{wordmark.big}</div>
      </div>
      <div className="atm-topper">
        <span className="atm-topper-title">{skin.labels.title(brand)}</span>
        <span className="atm-led" aria-hidden="true" />
      </div>
      <div className="atm-card-slot" />
      <div className="atm-screen">
        <div className="atm-screen-row">
          <span>{skin.labels.balance}</span>
          <span key={shownBalance} className={showCashOut ? "atm-balance-updated" : ""}>
            {shownBalance} {currency}
          </span>
        </div>
        <div className="atm-screen-row muted">
          <span>{recipientLabel ?? skin.labels.payTo}</span>
          <span>{recipient}</span>
        </div>
        <div className="atm-screen-row amount-row">
          <span>{skin.labels.amount}</span>
          <AmountDigits amount={amount} instant={instant} /> <span>{currency}</span>
        </div>
        <div className="atm-quick-tiles">
          {QUICK_TILES.map((t) => (
            <div className="atm-quick-tile" key={t}>
              {t}
            </div>
          ))}
        </div>
        {result !== "idle" && revealed && (
          <motion.div
            initial={instant ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: instant ? 0 : 0.1 }}
            className={`atm-banner ${accepted ? "accept" : refused ? "refuse" : ""}`}
          >
            {displayMessage}
          </motion.div>
        )}
        {result !== "idle" && revealed && skin.showHostFooter && rawMessage && (
          <div className="atm-host-footer">host: {rawMessage}</div>
        )}
      </div>
      <div className="atm-keypad">
        {KEYPAD_ROWS.map((row, ri) => (
          <div className="atm-keypad-row" key={ri}>
            {row.map((k) => (
              <div className="atm-key" key={k}>
                {k}
              </div>
            ))}
          </div>
        ))}
        <div className="atm-keypad-row atm-keypad-row-actions">
          <div className="atm-key atm-key-cancel">CANCEL</div>
          <div className="atm-key atm-key-clear">CLEAR</div>
          <div className="atm-key-confirm-wrap">
            <div className="atm-key atm-key-confirm">✓</div>
            {confirmCue && (
              <span className={`atm-confirm-cue ${instant ? "instant" : ""}`}>
                <span className="atm-confirm-cue-glyph" aria-hidden="true">
                  ←
                </span>
                <span className="atm-confirm-cue-text">{confirmCue}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="atm-bottom-bar">
        <span>Cancel</span>
        <span>Back</span>
        <span className="atm-bottom-bar-confirm">Confirm</span>
      </div>
      <div className="atm-cash-slot">
        {showCashOut &&
          [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`atm-note atm-note-${i}`}
              initial={instant ? false : { y: 16, opacity: 0, rotate: NOTE_ROTATIONS[i]! * 0.3 }}
              animate={{ y: 0, opacity: 1, rotate: NOTE_ROTATIONS[i] }}
              transition={
                instant ? { delay: 0 } : { delay: 0.5 + i * 0.08, type: "spring", stiffness: 320, damping: 20 }
              }
            >
              {i === 2 && (
                <>
                  <span className="atm-note-watermark" aria-hidden="true">
                    {symbol}
                  </span>
                  <span className="atm-note-face">{formatNoteAmount(amount, symbol)}</span>
                </>
              )}
            </motion.div>
          ))}
      </div>
      <div className="atm-receipt-slot" />
      {showCashOut && (
        <motion.div
          className="atm-receipt-ticket"
          initial={instant ? false : { y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: instant ? 0 : 0.45 }}
        >
          <span className="atm-receipt-ticket-title">{skin.labels.accepted(rawMessage)}</span>
          <span className="atm-receipt-ticket-amount">{formatNoteAmount(amount, symbol)}</span>
        </motion.div>
      )}
    </div>
  );
}
