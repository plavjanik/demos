/**
 * Assembles this demo's `PresentationContent` (kit/engine/content.ts) from
 * the generated build artefacts (src/generated/dogecics/*,
 * scripts/prerender.mts) plus this directory's own facts (workspace.ts,
 * components.ts, config.ts, compare.ts) — the ONE place that wraps
 * generated/demo-specific data into the shape every kit scene reads
 * through useContent(). DemoApp.tsx/bench.tsx are the only other files
 * allowed to import src/generated/** directly.
 */
import { CODE } from "../../generated/dogecics/code";
import { CAPTURES } from "../../generated/dogecics/captures";
import { CODE_PATH, EXPLORER_TREE } from "./workspace";
import { COMPONENTS } from "./components";
import { DEMO_BALANCE, DEMO_RECIPIENT, DEMO_CURRENCY, DEMO_CURRENCY_SYMBOL, DEMO_ATM_BRAND } from "./config";
import { buildCompareData } from "./compare";
import type { PresentationContent } from "../../kit/engine/content";

export const CONTENT: PresentationContent = {
  code: CODE,
  codePaths: CODE_PATH,
  explorerTree: EXPLORER_TREE,
  transcripts: CAPTURES.ansi,
  screens: CAPTURES.svgs,
  components: COMPONENTS,
  atm: {
    balance: DEMO_BALANCE,
    recipient: DEMO_RECIPIENT,
    currency: DEMO_CURRENCY,
    currencySymbol: DEMO_CURRENCY_SYMBOL,
    brand: DEMO_ATM_BRAND,
  },
  compare: buildCompareData(),
  // The title bar's own text ("DOGECICS — Visual Studio Code") is this
  // demo's chosen branding for both the title bar AND the Explorer
  // header — real VS Code shows the same workspace name in both places,
  // so PresentationContent has one field for it, not two.
  workspaceName: "demo-atm-limit",
  defaultStatusText: "Panelwright: tk5probe ● connected",
};
