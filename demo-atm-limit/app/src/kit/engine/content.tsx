/**
 * The seam between a demo's own facts (source files, captured transcripts,
 * screen captures, a workspace tree, architecture boxes, comparison
 * numbers) and the kit's scene components, which read this typed bag
 * instead of importing a demo's generated data or config directly. A demo
 * assembles one `PresentationContent` (see demo/content.ts for this app's
 * own) and wraps the app in `<ContentProvider content={...}>`; every scene
 * that needs a fact reads it via `useContent()`.
 */
import { createContext, useContext, type ReactNode } from "react";

export interface CodeEntry {
  lang: string;
  html: string;
  lines: number;
}

export interface TreeNode {
  name: string;
  path: string;
  kind: "dir" | "file";
  children?: TreeNode[];
  /** A `code` key, when clicking this leaf should open a generated slide. */
  codeKey?: string;
  /** Codicon name drawn instead of the default file/folder icon — e.g. "plug" for a service/datasource row, "list-flat" for an Endevor element (kit/vscode/Explorer.tsx). */
  icon?: string;
  /** Starts this dir node collapsed (chevron-right) instead of the default expanded. */
  collapsed?: boolean;
}

/**
 * One top-level collapsible section of the Explorer side bar (the real
 * "Explorer For Endevor" view has three: Endevor Elements, Endevor Element
 * History, Endevor Packages) — see `PresentationContent.explorerSections`.
 * A section with no `tree` renders as a bare collapsed header (a stand-in
 * for a real section this demo never opens).
 */
export interface ExplorerSection {
  title: string;
  tree?: TreeNode[];
  /** Starts this section collapsed — default expanded. */
  collapsed?: boolean;
}

/** One box in the component strip (kit/diagrams/ComponentsStrip.tsx) — the path a request travels, drawn left to right. */
export interface ComponentBox {
  id: string;
  label: string;
  sub: string;
}

/**
 * The ATM kit's own brand facts — everything a skin (kit/atm/skins.ts)
 * needs to build its wordmark/header title, without any skin hardcoding a
 * demo's brand name. A skin decides layout/casing/decoration around these;
 * the words themselves live here.
 */
export interface AtmBrand {
  small?: string;
  big: string;
  unit?: string;
  /** Drawn on the fascia above the wordmark, all skins, max ~200×60 stage px — omit for no logo (the DOGECICS ATM). */
  logoUrl?: string;
}

export interface CompareGroup {
  group: string;
  ms: number;
  color: string;
}

export interface CompareManualRow {
  title: string;
  kinds: { thinking: number; typing: number; mechanics: number };
}

/** Data for kit/diagrams/CompareScene.tsx — every number computed by the demo (see demo/compare.ts); the scene only draws. */
export interface CompareData {
  title: string;
  agent: {
    groups: CompareGroup[];
    /** Time spent outside the measured loop on either side (e.g. an after-the-fact check) — shown as a note, counted on neither bar. */
    afterCheckMs: number;
    afterCheckLabel: string;
  };
  manual: CompareManualRow[];
  /** e.g. "150 chars/min" — quoted in the typing segment's own label. */
  typingRateLabel: string;
  /** How the manual rows' "mechanics" minutes were obtained — "measured" (DOGECICS: a stopwatch on the real host) or "estimate" (Techutex: no manual run was timed). Shown as the segment's own tag and in the legend; a demo must say which, so an estimate never wears a "measured" tag. */
  mechanicsBasis: "measured" | "estimate";
  /** The headline's own qualifier, e.g. "manual, with tests — vs. agent". */
  ratioLabel: string;
  /** Closing line under the bars. */
  takeaway: string;
}

export interface PresentationContent {
  /** Prerendered source-file HTML, keyed by whatever key Step.vscode.openFile/diffOf names. */
  code: Record<string, CodeEntry>;
  /** Same keys as `code` — the workspace-relative path VS Code would show for them (editor tab label). */
  codePaths: Record<string, string>;
  explorerTree: TreeNode[];
  /**
   * Replaces the single workspaceName+explorerTree section with N
   * collapsible sections (the real "Explorer For Endevor" view) — when
   * present, `explorerTree`/`workspaceName` are ignored by the Explorer
   * component; when absent, today's single-section layout is unchanged.
   */
  explorerSections?: ExplorerSection[];
  /** Explorer side bar header text — default "Explorer". */
  explorerTitle?: string;
  /** Codicon name for an extra activity-bar icon, shown selected in place of the default Explorer/files icon (e.g. an Endevor-flavoured icon) — omit for the ordinary VS Code activity bar. Ignored when `activityBarExtraIconUrl` is also set. */
  activityBarExtra?: string;
  /** An SVG used as a CSS mask in the activity bar's foreground colour, exactly as VS Code draws an extension's own view-container icon — e.g. a real extension's `contributes.viewsContainers.activitybar[0].icon`. Wins over `activityBarExtra` when both are set — the extra icon's tooltip is always "Explorer For Endevor" either way. */
  activityBarExtraIconUrl?: string;
  /** Terminal replay transcripts, keyed by Step.vscode.terminalAnsi. */
  transcripts: Record<string, string>;
  /** 3270 (or other captured-screen) SVGs, keyed by Step.atm.screenSvg/screenSvgIdle. */
  screens: Record<string, string>;
  components: ComponentBox[];
  atm: {
    balance: string;
    recipient: string;
    currency: string;
    /** Glyph for the banknote watermark/face — omit to reuse `currency` itself. */
    currencySymbol?: string;
    brand: AtmBrand;
    /** Label for the ATM's second screen line — default "Recipient" (kit/atm/skins.ts). */
    recipientLabel?: string;
    /** The 3270 panel's own caption (kit/atm/AtmScene.tsx) — default "what the mainframe actually showed"; a demo whose host isn't a "mainframe" in the audience's own words (e.g. "a CICS application") can override it. */
    screenCaption?: string;
  };
  compare?: CompareData;
  /** Explorer header / title bar workspace name, e.g. "my-app" — the title bar shows "`${workspaceName} — Visual Studio Code`". */
  workspaceName: string;
  /** Status bar text for a VS Code step that doesn't set its own Step.vscode.statusText — omit to fall back to a generic "Ready". */
  defaultStatusText?: string;
  /** Whether DemoApp mounts the agent-loop `<TimerHud />` (kit/stage/TimerHud.tsx) for this demo — default true. Techutex's owner asked for it gone (review round 6); DOGECICS keeps it. */
  timerHud?: boolean;
}

const ContentContext = createContext<PresentationContent | null>(null);

export function ContentProvider({
  content,
  children,
}: {
  content: PresentationContent;
  children: ReactNode;
}): React.JSX.Element {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent(): PresentationContent {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent() outside <ContentProvider>");
  return ctx;
}
