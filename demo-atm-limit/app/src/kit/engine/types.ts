/**
 * The step engine's data model — kit-generic, no reference to any one
 * demo's own steps module. A presentation is driven from an array of Step
 * (StepEngineProvider's `steps` prop): every scene reads its own optional
 * slice of a Step and ignores the rest, so a step can freely mix scene
 * kinds across the story.
 */
export type Scene = "atm" | "vscode" | "compare" | "process" | "title";

export interface Hotspot {
  /** CSS selector or a data-hotspot id the scene renders; clicking it advances the step. */
  target: string;
  label: string;
}

export interface AtmStep {
  amount?: string;
  result?: "idle" | "typing" | "accepted" | "refused";
  message?: string;
  /** Key into ContentProvider's `screens`, e.g. "atm-after-50000/04-send-result" — shown once revealed (or always, if `screenSvgIdle` is omitted). */
  screenSvg?: string;
  /** Key into `screens` shown BEFORE reveal (e.g. a host's main menu) — the 3270 panel can be visible from the start of a step and swap to `screenSvg` on reveal, instead of only appearing already-revealed. */
  screenSvgIdle?: string;
  showThreeTwoSeventy?: boolean;
  /** Small muted text under the 3270 panel — e.g. noting the captured screen is on a different account than the one the ATM display shows (a screen captured in a separate pass, on whatever account satisfied the capture's own condition). Generic: the kit just renders the string, verbatim. */
  screenNote?: string;
  /** Hold the result banner/cash-out until the component strip's packet.round-trip animation returns (skipped entirely in instant mode). */
  holdForPacket?: boolean;
  /** Overrides the ?atm=/localStorage skin choice (kit/atm/skins.ts) for this one step. */
  skin?: string;
}

export interface DiagramStep {
  /** "round-trip" plays the component strip's send-and-reply journey (first box to last box and back) once. */
  packet?: "none" | "atm-to-host" | "host-to-atm" | "round-trip";
  highlight?: string[];
}

/** One box in a ProcessScene lane. */
export interface ProcessNode {
  id: string;
  label: string;
  /** A decision node ("RC 12?"), styled as a pill distinct from a plain action box — the `?` suffix in `label` is what actually reads as a question; this only controls the shape/color. */
  decision?: boolean;
  /** Small grey mono time estimate under the label ("~30 min", "8 s") — computed from manualTimings.ts, never hand-typed; omit for a node with no number of its own (its time is folded into a neighbor's). */
  timeHint?: string;
}

/** A loop-back arrow within one lane, drawn as a curve from `from` back up to `to`. */
export interface ProcessLoopback {
  from: string;
  to: string;
  /** Small text set on the curve itself (e.g. "compile error: +~35 min") — the REASON for the loop, distinct from the decision node's own question text; may fold in its own computed time estimate. */
  label?: string;
}

export interface ProcessLane {
  /** "tools" — a lane of MCP (or other) tool calls, plug codicon — is generic: any demo whose agent lane talks to more than one named tool server can use it, not just a specific demo's own tool set. */
  icon: "person" | "spark" | "host" | "tools";
  label: string;
  nodes: ProcessNode[];
  loopbacks?: ProcessLoopback[];
  /** False: render this lane's nodes with no connector arrows between them (the vertical spacing stays) — for a lane whose items don't run in a pipeline, e.g. the MCP tools an agent calls out to (the tools never call each other; ProcessDiagram.links draws which AGENT step calls which). Defaults to true (the normal top-to-bottom pipeline look). */
  chain?: boolean;
}

export interface ProcessDiagram {
  title: string;
  lanes: ProcessLane[];
  /** Milliseconds between one node appearing and the next when the step is entered (ProcessScene.tsx's reveal). steps.ts sets the "without an agent" diagram several times slower than the agent one — the pace itself is part of the message. Omit for ProcessScene's default. */
  revealMsPerNode?: number;
  /** The big total/callout block under this diagram — e.g. "≈ 2 h 20 min hand-tested · 3 h 07 min with the same tests" (left) or "With the agent: minutes — you will watch it happen" (right). Plain string keeps ProcessScene generic; steps.ts computes it from the shared timing functions. */
  summary?: string;
  /** Smaller second line under `summary` (e.g. "measured 9:23 on the last slide"). */
  summarySub?: string;
  /** Tints `summary`/`summarySub` the amber accent instead of plain white/grey — the right diagram's "watch it happen" callout. */
  summaryAccent?: boolean;
  /**
   * Subtle cross-lane links (node id -> node id), drawn as one dashed muted
   * line per link over the whole diagram — e.g. an agent step to the MCP
   * tool it calls out to. Distinct from a lane's own `loopbacks`: a
   * loopback curves within ONE lane back up to an earlier step; a link
   * points sideways, across lanes, to a step's own dependency, and never
   * implies the two target nodes call each other (ProcessScene.tsx draws
   * an arrowhead only at `to`). Revealed only once BOTH nodes have been
   * revealed by the diagram's own node-by-node reveal.
   */
  links?: Array<{ from: string; to: string }>;
  /**
   * Chronological order of node ids across ALL lanes, replacing the
   * default lane-by-lane layout/reveal with a shared row grid: one entry
   * is one ROW of the diagram, and an array entry is nodes that happen
   * together and share a row (e.g. an agent step and the MCP tool it
   * calls). Each lane stays its own column, but a node is placed at the
   * grid row its id occupies instead of packed under its lane's neighbors
   * — cells where a lane has nothing that row stay empty, and a chained
   * lane's connector spans whatever empty rows sit between two of its own
   * nodes. The reveal counts ROWS instead of nodes: one row's ids (one or
   * two) appear together. A node id present in a lane but missing from
   * `sequence` is placed on its own row after every sequence row (reveals
   * last) — useful for a node whose place in the story doesn't matter. A
   * diagram with no `sequence` keeps the original per-lane layout and
   * lane-by-lane reveal, unaffected by any of this.
   */
  sequence?: Array<string | string[]>;
}

export interface ProcessStepData {
  left: ProcessDiagram;
  right: ProcessDiagram;
}

export type ChatItem =
  | { kind: "user"; text: string; typed?: boolean }
  | {
      kind: "assistant";
      text: string;
      /** Extra ms the stagger waits before revealing THIS item — see the `tool` kind's field of the same name; an assistant summary of a terminal replay uses this so it doesn't appear before the replay has actually finished scrolling by. */
      revealAfterMs?: number;
    }
  /** The grey status row the reference shows before a turn's first tool call — rendered as "Thinking…" with no duration, since nothing in the capture measures this. */
  | { kind: "thinking" }
  | {
      kind: "tool";
      tool: "Search" | "Read" | "Edit" | "Write" | "Bash";
      /** Bold verb shown before `title` — the reference shows "Bash" + a short summary, not the raw command, so this defaults to `tool` itself but can override it ("Search" for a Grep-shaped call, etc). */
      verb?: string;
      title: string;
      /**
       * An MCP tool call instead of a built-in one — renders a plug codicon,
       * the server name bold, then the tool name (e.g.
       * "Endevor MCP › get_element_content"), ahead of the usual title/
       * duration/IN-OUT. The exact real-extension rendering of an MCP row is
       * unverified — no reference screenshot of one exists yet. `server` is
       * a display name for the stage, not necessarily the server's own
       * package/registration id — a demo that wants the real id keeps it in
       * a code comment.
       */
      mcp?: { server: string; tool: string };
      /**
       * A small muted badge at the end of the row, styled quiet (never a
       * warning) — the row's OUTPUT can still be real even when its badge
       * says the CALL wasn't. Free text, but two meanings recur enough to
       * have their own tooltips (ChatPanel.tsx's BADGE_TOOLTIP): "proposed"
       * — this tool doesn't exist on the real server yet (tooltip: "this
       * tool is proposed, not shipped; the output shown is from the real
       * run"); "staged" — a real tool, but this particular call was not
       * made in the recorded run (tooltip: "this call was not made in the
       * recorded run; the output is derived from captured material").
       * `proposed: true` is a shorthand for `badge: "proposed"`.
       */
      badge?: string;
      /** @deprecated shorthand for `badge: "proposed"` — kept so existing demo data keeps working. */
      proposed?: boolean;
      /** IN box (command/args) — omit for a bare Read with nothing worth showing. */
      input?: string;
      /** OUT box (captured output) — expandable together with `input`. */
      output?: string;
      /**
       * pending: waits for the presenter's click on the 3-button approval
       * card (Hotspot.tsx) — the one element in this panel not verified
       * against the real extension, see ChatPanel.tsx's ApprovalCard. Only
       * the host upload/compile step stages this now (step `upload-approval`)
       * — the plan itself is the other pending card, but that's its own
       * `plan-approval` kind, not a tool row. Anything else: already
       * resolved, rendered as a plain completed row with no card.
       */
      approval?: "pending" | "resolved";
      durationMs?: number;
      /** Extra ms the stagger waits before revealing THIS item, beyond its normal ~0.4s slot — e.g. a chat summary that must not appear until a terminal replay it refers to has actually finished scrolling by. */
      revealAfterMs?: number;
    }
  | { kind: "result"; text: string; tone?: "ok" | "error" }
  /**
   * Claude Code's own plan-mode approval card, shown once after a plan is
   * presented — "pending" renders the 3-button card (Yes and auto-accept /
   * Yes, manually approve / No, keep planning); anything else renders the
   * compact resolved row "Plan approved · auto-accept edits". Distinct from
   * the tool row's `approval` card: a plan isn't a tool call.
   */
  | { kind: "plan-approval"; approval: "pending" | "resolved" };

/** One staged compiler/editor diagnostic (VSCodeStep.diagnostics) — drawn as a wavy underline on the named source line plus a gutter marker, and listed in the PROBLEMS panel. Never live analysis: the run this stages from had no editor open (see the step that uses it for why). */
export interface Diagnostic {
  /** 1-indexed source line. */
  line: number;
  severity: "error" | "warning";
  message: string;
  /** e.g. "COBOL Language Support". */
  source: string;
  /** e.g. an IGYDS0017-E-style compiler message code. */
  code?: string;
}

export interface VSCodeStep {
  /** Key into generated CODE — omit for the "no editor open" empty state (the empty-chat warm-up step). */
  openFile?: string;
  editorMode?: "code" | "diff";
  /** Two CODE keys the diff tab label is built from ("v0" -> "v1" etc); the diff HTML itself is `openFile`'s entry. */
  diffOf?: [string, string];
  /** Staged diagnostics on `openFile` — squiggles/gutter markers in the editor; shown in the PROBLEMS panel when `panel: "problems"`. */
  diagnostics?: Diagnostic[];
  panel?: "terminal" | "problems" | "none";
  /** Key into generated CAPTURES.ansi. */
  terminalAnsi?: string;
  terminalReplay?: boolean;
  /** Taller terminal panel (most of the editor column) so a whole vitest run is visible without scrolling — every VS Code step keeps its chat panel now (never a full-screen terminal takeover), so a full transcript needs more room than the default panel height. */
  panelExpanded?: boolean;
  chat?: ChatItem[];
  /** Index into `chat` — `openFile`/`explorerSelected`/`highlightLines` only take effect once the chat panel's stagger has revealed the item at this index (empty-editor state before). For a step whose file only becomes relevant once the agent actually reads it on screen (the empty "no editor open" warm-up answer), rather than being open from the moment the step is entered. */
  openFileAtChatIndex?: number;
  /** The Claude Code session's own name, shown in the chat header once any message has been sent — "Untitled" before that, matching a real fresh session. Distinguishes the two sessions this story now drives: the warm-up ("Tests for the ATM") and the ticket itself ("Daily withdrawal limit"), the latter a genuinely NEW session the `ticket` step starts. */
  sessionTitle?: string;
  /**
   * "typing": the input box types `chat`'s last (user) item character by
   * character, then sends it (Hotspot-free — runs on entering the step).
   * "idle": the input rests normally (used while a pending approval card
   * waits on the presenter, since the agent is paused for a decision, not
   * generating — unverified against the real extension, see NOTES.md).
   * Omit for the default "streaming" look (orange border, stop button,
   * "Queue another message…") appropriate while the agent is working.
   */
  chatInput?: "typing" | "idle";
  autoMode?: boolean;
  explorerSelected?: string;
  statusText?: string;
  /** 1-indexed source line to center the editor on (generic — any VS Code step can use it). */
  scrollToLine?: number;
  /** One or more 1-indexed inclusive [start, end] source line ranges to give a subtle highlight — an array so non-contiguous lines (e.g. four `test("…")` description lines scattered through a file) can all highlight at once. */
  highlightLines?: Array<[number, number]>;
  /**
   * Elapsed ms since the captured run's own "start" stage (CAPTURES.timings)
   * to jump the TimerHud to on this step — a real captured stamp, not a
   * wall-clock tick. Omit to leave the HUD showing whatever it last jumped
   * to (it never ticks on its own).
   */
  timerElapsedMs?: number;
}

/** The opening title slide's own copy — distinct from `Step.title`, the short label the presenter bar/step rail show for every step. Only the `"title"`-scene step needs this. */
export interface TitleStep {
  headline: string;
  subline: string;
  /** Bottom-right logo, ~360 stage px wide — omit for no logo (the DOGECICS title slide). */
  logoUrl?: string;
}

export interface Step {
  id: string;
  scene: Scene;
  title: string;
  /** Shown in the presenter bar at the bottom. */
  caption: string;
  hotspot?: Hotspot;
  atm?: AtmStep;
  diagram?: DiagramStep;
  vscode?: VSCodeStep;
  /** The `"title"`-scene step's own headline/subline — see TitleStep. */
  titleScene?: TitleStep;
  process?: ProcessStepData;
  /** Starts the "agent loop" timer HUD on this step. */
  timerStart?: boolean;
  /** Freezes the timer HUD on this step. */
  timerStop?: boolean;
  /** A presenter's spoken-cue callout, anchored bottom-right of the stage above the presenter bar — a first draft Petr will edit, hidden entirely by the status bar's narration toggle. */
  narration?: string;
  /** A second callout on the SAME step, shown once the step's own hotspot has fired once (e.g. after the ATM's confirm+reveal) — replaces `narration`, not stacked with it. */
  narrationAfter?: string;
  /** Overrides what TTS actually SPEAKS for `narration` — the on-screen text stays `narration` itself. For cases where the spoken form should differ from the written one: a number better said as words, a code identifier better said as its parts. Reduced through the same Markdown-stripping as `narration` (kit/engine/speechText.ts) — no need to pre-strip it. */
  narrationSpeech?: string;
  /** Same as `narrationSpeech`, for `narrationAfter`. */
  narrationAfterSpeech?: string;
  /** Which side of the stage the callout sits on, to dodge scene content (e.g. the chat panel on the right) — defaults to "right". "top" is a full-width band above the whole stage instead: Stage.tsx reserves --narration-top-height of real screen pixels there (the same mechanism --presenter-bar-height already uses below), so the scaled scene is fit into the remaining box and visibly shifts down — a reserved region that cannot overlap scene content AT ANY SIZE, unlike a measured lift. Use it for a scene whose own layout has no real gap a lift could find (ProcessScene's lane columns, packed edge to edge — a "left"/"right" data-keep-clear lift was tried there and reverted, see ProcessScene.tsx). NarrationCallout.tsx only runs the lift for "left"/"right". */
  narrationSide?: "left" | "right" | "top";
}
