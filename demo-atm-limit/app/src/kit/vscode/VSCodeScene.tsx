/**
 * Pixel-faithful VS Code Dark Modern chrome, driven entirely by
 * Step.vscode: title bar, activity bar, Explorer, editor (code or inline
 * diff), a TERMINAL panel that replays a captured transcript, and the
 * Claude Code chat side bar. Every source string it doesn't get from
 * Step.vscode itself comes from the demo's own content (useContent()).
 */
import { useState } from "react";
import { useStepEngine } from "../engine/StepEngine";
import { useContent } from "../engine/content";
import type { Step } from "../engine/types";
import { TitleBar } from "./TitleBar";
import { ActivityBar } from "./ActivityBar";
import { Explorer } from "./Explorer";
import { Editor } from "./Editor";
import { TerminalPane } from "./Terminal";
import { ProblemsPanel } from "./Problems";
import { ChatPanel } from "./ChatPanel";
import { StatusBar } from "./StatusBar";
import "./VSCodeScene.css";

/** How many of the current step's chat items were already on screen at the
 * most recent EARLIER chat-bearing step (skipping any full-screen terminal
 * interludes with no chat panel at all) — everything up to that count is
 * settled history and renders at once; the rest streams in. */
function chatRevealFrom(steps: Step[], index: number): number {
  const current = steps[index]!.vscode?.chat;
  if (!current) return 0;
  for (let i = index - 1; i >= 0; i--) {
    const prior = steps[i]!.vscode?.chat;
    if (prior) {
      // A session reset (a step that starts a brand-new session) can only
      // ever make the chat array SHORTER than the nearest earlier
      // chat-bearing step's — a continuing session only ever grows. Treat
      // that case as nothing-yet-settled rather than clamping, so the whole
      // new session streams in as new instead of appearing pre-revealed.
      if (current.length < prior.length) return 0;
      return Math.min(prior.length, current.length);
    }
  }
  return 0;
}

export function VSCodeScene({ step }: { step: Step }): React.JSX.Element {
  const { instant, steps, index } = useStepEngine();
  const content = useContent();
  const v = step.vscode;
  // How much of THIS step's own chat has actually been revealed on screen —
  // reported by ChatPanel as it stages items in; gates openFileAtChatIndex
  // below. Remounts to 0 on every step change (SceneSwitch keys on step.id).
  const [revealedChatCount, setRevealedChatCount] = useState(0);
  if (!v) return <div className="vsc-shell" />;

  const showTerminal = v.panel === "terminal";
  const showProblems = v.panel === "problems";
  const ansiText = v.terminalAnsi ? content.transcripts[v.terminalAnsi] : undefined;
  // openFileAtChatIndex: the editor stays in its empty state until the chat
  // item at that index has actually appeared (revealedChatCount > index) —
  // used for a warm-up answer, where the file opens only once the agent's
  // own Read row is on screen, not from the moment the step is entered.
  const fileGateOpen = v.openFileAtChatIndex === undefined || revealedChatCount > v.openFileAtChatIndex;
  const effectiveOpenFile = fileGateOpen ? v.openFile : undefined;
  const effectiveExplorerSelected = fileGateOpen ? v.explorerSelected : undefined;
  const effectiveHighlightLines = fileGateOpen ? v.highlightLines : undefined;
  const langLabel = !effectiveOpenFile
    ? ""
    : effectiveOpenFile.endsWith(".cbl") || effectiveOpenFile.endsWith(".diff")
      ? "COBOL"
      : effectiveOpenFile.endsWith(".jcl")
        ? "JCL"
        : effectiveOpenFile.endsWith(".md")
          ? "Markdown"
          : "TypeScript";

  return (
    <div className="vsc-shell">
      <TitleBar workspaceName={content.workspaceName} />
      <div className="vsc-body">
        <ActivityBar />
        <div className="vsc-sidebar">
          <Explorer selected={effectiveExplorerSelected} />
        </div>
        <div className="vsc-main">
          <div className="vsc-editor-and-panel">
            <Editor
              openFile={effectiveOpenFile}
              diffOf={v.diffOf}
              scrollToLine={v.scrollToLine}
              highlightLines={effectiveHighlightLines}
              diagnostics={v.diagnostics}
            />
            {showTerminal && ansiText !== undefined && (
              <div className={`vsc-panel ${v.panelExpanded ? "vsc-panel-expanded" : ""}`}>
                <div className="vsc-panel-tabs">
                  <span className="active">
                    <span className="codicon codicon-terminal" /> TERMINAL
                  </span>
                </div>
                <TerminalPane text={ansiText} replay={!!v.terminalReplay} instant={instant} />
              </div>
            )}
            {showProblems && v.diagnostics && (
              <div className={`vsc-panel ${v.panelExpanded ? "vsc-panel-expanded" : ""}`}>
                <div className="vsc-panel-tabs">
                  <span className="active">
                    <span className="codicon codicon-warning" /> PROBLEMS
                    <span className="vsc-panel-tab-badge">{v.diagnostics.length}</span>
                  </span>
                </div>
                <ProblemsPanel diagnostics={v.diagnostics} />
              </div>
            )}
          </div>
          {v.chat && (
            <ChatPanel
              items={v.chat}
              revealFrom={chatRevealFrom(steps, index)}
              chatInput={v.chatInput}
              instant={instant}
              autoMode={!!v.autoMode}
              showAutoModeToggle={step.hotspot?.target === "chat-automode-toggle"}
              sessionTitle={v.sessionTitle}
              onRevealChange={setRevealedChatCount}
            />
          )}
        </div>
      </div>
      <StatusBar lang={langLabel} statusText={v.statusText ?? content.defaultStatusText ?? "Ready"} />
    </div>
  );
}
