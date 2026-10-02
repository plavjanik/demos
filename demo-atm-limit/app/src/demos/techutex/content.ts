/**
 * Assembles this demo's `PresentationContent` (kit/engine/content.ts) from
 * the generated build artefacts (src/generated/techutex/*,
 * scripts/prerender.mts) plus this directory's own facts (workspace.ts,
 * components.ts, config.ts, compare.ts).
 */
// The real "Explorer For Endevor" activity-bar icon, from the marketplace
// package (v1.11.5) `contributes.viewsContainers.activitybar[0].icon` —
// rendered as a CSS mask, so its fill colour is irrelevant (only the path's
// alpha channel matters); see brand/explorer-for-endevor.svg's own comment.
import e4eIcon from "../../../../../demo-techutex-limit/brand/explorer-for-endevor.svg";
import { CODE } from "../../generated/techutex/code";
import { CAPTURES } from "../../generated/techutex/captures";
import { CODE_PATH, EXPLORER_SECTIONS } from "./workspace";
import { COMPONENTS } from "./components";
import { DEMO_BALANCE, DEMO_RECIPIENT, DEMO_CURRENCY, DEMO_CURRENCY_SYMBOL, DEMO_ATM_BRAND } from "./config";
import { buildCompareData } from "./compare";
import type { PresentationContent } from "../../kit/engine/content";

export const CONTENT: PresentationContent = {
  code: CODE,
  codePaths: CODE_PATH,
  explorerTree: [],
  explorerSections: EXPLORER_SECTIONS,
  explorerTitle: "Explorer For Endevor",
  activityBarExtraIconUrl: e4eIcon,
  transcripts: CAPTURES.logs,
  screens: CAPTURES.svgs,
  components: COMPONENTS,
  atm: {
    balance: DEMO_BALANCE,
    recipient: DEMO_RECIPIENT,
    currency: DEMO_CURRENCY,
    currencySymbol: DEMO_CURRENCY_SYMBOL,
    brand: DEMO_ATM_BRAND,
    recipientLabel: "Account",
    // Owner's call for this demo only (kit default stays "what the
    // mainframe actually showed") — the audience-facing word for the CICS region
    // here is "CICS application", not "mainframe".
    screenCaption: "CICS application",
  },
  compare: buildCompareData(),
  // Owner, review round 10: the window title names the demo bank, not the
  // OSS repo the captures came from (that name stays in the captures).
  workspaceName: "techutex-banking",
  // Display name only, no raw server id on stage — real id: code4z-cowboys.
  defaultStatusText: "Endevor MCP ● connected",
  // Owner's call, review round 6: no agent-loop timer widget on this demo.
  timerHud: false,
};
