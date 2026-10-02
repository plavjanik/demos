/**
 * ATM skin decision bench: the three skins (kit/atm/skins.ts) side by side
 * in the same "50,000 accepted" state, and again "refused", so a viewer
 * can pick one by looking rather than by description. No step engine here
 * — just AtmMachine, the presentational component kit/atm/AtmScene.tsx
 * also uses, driven with this demo's own facts (config.ts) passed
 * explicitly rather than through ContentProvider (there is no Step here
 * to drive one).
 */
import { createRoot } from "react-dom/client";
import "@vscode/codicons/dist/codicon.css";
import "./styles/global.css";
import "./bench.css";
import { AtmMachine } from "./kit/atm/AtmMachine";
import { ATM_SKINS } from "./kit/atm/skins";
import {
  DAILY_LIMIT,
  DEMO_BALANCE,
  DEMO_RECIPIENT,
  DEMO_CURRENCY,
  DEMO_CURRENCY_SYMBOL,
  DEMO_ATM_BRAND,
} from "./demos/dogecics/config";

const SKIN_ORDER = ["doge", "bank", "terminal"] as const;
const LETTER = ["A", "B", "C"] as const;

function Cell({
  letter,
  skinId,
  result,
}: {
  letter: string;
  skinId: (typeof SKIN_ORDER)[number];
  result: "accepted" | "refused";
}) {
  const skin = ATM_SKINS[skinId]!;
  const message =
    result === "accepted" ? `SENDING 50000 ${DEMO_CURRENCY}` : `DAILY LIMIT ${DAILY_LIMIT} ${DEMO_CURRENCY} EXCEEDED`;
  return (
    <div className="bench-cell">
      <div className="bench-cell-label">
        {letter} — {skin.name}
      </div>
      <div className="bench-cell-stage">
        <div className="bench-cell-inner">
          <AtmMachine
            skin={skin}
            amount="50000"
            result={result}
            message={message}
            instant
            revealed
            balance={DEMO_BALANCE}
            recipient={DEMO_RECIPIENT}
            currency={DEMO_CURRENCY}
            currencySymbol={DEMO_CURRENCY_SYMBOL}
            brand={DEMO_ATM_BRAND}
          />
        </div>
      </div>
    </div>
  );
}

function Bench() {
  return (
    <div className="bench-page">
      <h1 className="bench-title">ATM skin bench</h1>
      <div className="bench-section">
        <div className="bench-section-label">Accepted</div>
        <div className="bench-row">
          {SKIN_ORDER.map((id, i) => (
            <Cell key={id} letter={LETTER[i]!} skinId={id} result="accepted" />
          ))}
        </div>
      </div>
      <div className="bench-section">
        <div className="bench-section-label">Refused</div>
        <div className="bench-row">
          {SKIN_ORDER.map((id, i) => (
            <Cell key={id} letter={LETTER[i]!} skinId={id} result="refused" />
          ))}
        </div>
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");
createRoot(root).render(<Bench />);
