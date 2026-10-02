/**
 * The right-hand Claude Code secondary side bar, rebuilt to match the real
 * v2.1.280 VS Code extension (see the mandatory reference,
 * scratchpad/ccref/NOTES.md + its 23 screenshots — every visual choice here
 * traces back to one of them, EXCEPT the approval card, which auto mode
 * kept us from ever seeing for real: see ApprovalCard below).
 */
import { useEffect, useRef, useState } from "react";
import { Hotspot } from "../stage/Hotspot";
import { MarkdownLite } from "./markdownLite";
import { SPINNER_GLYPHS, SPINNER_VERBS } from "./spinnerVerbs";
import type { ChatItem } from "../engine/types";
import "./ChatPanel.css";

function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const TOOL_ICON: Record<Extract<ChatItem, { kind: "tool" }>["tool"], string> = {
  Search: "codicon-search",
  Read: "codicon-book",
  Edit: "codicon-edit",
  Write: "codicon-new-file",
  Bash: "codicon-terminal",
};

/** The two badge meanings that recur across demos — see ChatItem's own doc comment. A badge string with no entry here just shows with no tooltip. */
const BADGE_TOOLTIP: Record<string, string> = {
  proposed: "this tool is proposed, not shipped; the output shown is from the real run",
  staged: "this call was not made in the recorded run; the output is derived from captured material",
};

/**
 * NOT VERIFIED against the real extension — every real run in NOTES.md had
 * this machine's account set to auto-approve (`defaultMode: "auto"`), so no
 * permission prompt was ever captured (see NOTES.md, "Things that did not
 * work"). Wording follows the Claude Code CLI's own three-choice prompt
 * ("Yes" / "Yes, and don't ask again this session" / "No"); styling matches
 * the rest of this panel by inference, not by reference.
 */
function ApprovalCard({ hotspotId }: { hotspotId: string }): React.JSX.Element {
  return (
    <div className="cc-approval">
      <Hotspot id={hotspotId} labelPlacement="none">
        <span className="cc-approval-btn cc-approval-yes">Yes</span>
      </Hotspot>
      <span className="cc-approval-btn cc-approval-yes-always">Yes, and don&apos;t ask again this session</span>
      <span className="cc-approval-btn cc-approval-no">No</span>
    </div>
  );
}

/**
 * Claude Code's own plan-mode approval card — wording taken from the real
 * CLI's plan-mode prompt, unlike ApprovalCard above (which is unverified).
 * Resolved renders the compact grey row a real session leaves behind once
 * a plan is approved.
 */
function PlanApprovalRow({ item }: { item: Extract<ChatItem, { kind: "plan-approval" }> }): React.JSX.Element {
  if (item.approval === "resolved") {
    return (
      <div className="cc-row cc-row-plan-resolved">
        <span className="cc-dot cc-dot-grey" aria-hidden="true" />
        <div className="cc-row-body cc-plan-resolved-text">Plan approved · auto-accept edits</div>
      </div>
    );
  }
  return (
    <div className="cc-row cc-row-plan-approval">
      <div className="cc-row-body">
        <div className="cc-plan-approve-question">Would you like to proceed?</div>
        <div className="cc-plan-approve-buttons">
          <Hotspot id="chat-approve" labelPlacement="none">
            <span className="cc-approval-btn cc-approval-yes">Yes, and auto-accept edits</span>
          </Hotspot>
          <span className="cc-approval-btn">Yes, manually approve edits</span>
          <span className="cc-approval-btn cc-approval-no">No, keep planning</span>
        </div>
      </div>
    </div>
  );
}

/**
 * The status row a real Claude Code panel shows as its LAST row while a turn
 * is in flight: a cycling spinner glyph plus a verb that changes every few
 * seconds (see ChatPanel's `working` — this row is purely derived from it,
 * never part of the step data). Cadence is presentation pacing, not measured
 * against anything.
 */
function WorkingRow(): React.JSX.Element {
  const [glyphIndex, setGlyphIndex] = useState(0);
  const [verb, setVerb] = useState(() => SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)]!);

  useEffect(() => {
    const id = setInterval(() => setGlyphIndex((i) => (i + 1) % SPINNER_GLYPHS.length), 120);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setVerb(SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)]!), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="cc-row cc-row-working">
      <span className="cc-spinner-glyph" aria-hidden="true">
        {SPINNER_GLYPHS[glyphIndex]}
      </span>
      <span className="cc-working-verb">{verb}…</span>
    </div>
  );
}

function InOutBox({ input, output }: { input?: string; output?: string }): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(false);
  if (!input && !output) return null;
  const collapsedChars = 260;
  const full = [input ? `IN  ${input}` : "", output ? `OUT ${output}` : ""].filter(Boolean).join("\n");
  const isLong = full.length > collapsedChars;
  const shown = expanded || !isLong ? full : full.slice(0, collapsedChars) + "…";
  return (
    <div className="cc-inout">
      <pre>{shown}</pre>
      {isLong && (
        <button type="button" className="cc-inout-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "collapse" : "expand"}
        </button>
      )}
    </div>
  );
}

function ToolRow({
  item,
  resolved,
  hotspotId,
  railClass = "",
}: {
  item: Extract<ChatItem, { kind: "tool" }>;
  resolved: boolean;
  hotspotId?: string;
  railClass?: string;
}): React.JSX.Element {
  const verb = item.verb ?? item.tool;
  return (
    <div className={`cc-row cc-row-tool ${railClass}`}>
      <span className={`cc-dot ${resolved ? "cc-dot-green" : "cc-dot-grey"}`} aria-hidden="true" />
      <div className="cc-row-body">
        <div className="cc-tool-line">
          {item.mcp ? (
            // Exact real-extension rendering of an MCP tool row is
            // unverified (no reference screenshot exists yet) — plug icon,
            // server name bold, tool name after it, same as the reference's
            // "codicon + bold verb + mono title" shape for a built-in tool.
            <>
              <span className="codicon codicon-plug" />
              <strong>{item.mcp.server}</strong>
              <span className="cc-tool-title">› {item.mcp.tool}</span>
            </>
          ) : (
            <>
              <span className={`codicon ${TOOL_ICON[item.tool]}`} />
              <strong>{verb}</strong>
              <span className="cc-tool-title">{item.title}</span>
            </>
          )}
          {item.durationMs !== undefined && <span className="cc-tool-duration">{formatDuration(item.durationMs)}</span>}
          {(item.badge ?? (item.proposed ? "proposed" : undefined)) && (
            <span className="cc-proposed-badge" title={BADGE_TOOLTIP[item.badge ?? "proposed"] ?? undefined}>
              {item.badge ?? "proposed"}
            </span>
          )}
        </div>
        {item.mcp && <div className="cc-tool-title cc-mcp-title">{item.title}</div>}
        <InOutBox input={item.input} output={item.output} />
        {item.approval === "pending" && hotspotId && <ApprovalCard hotspotId={hotspotId} />}
      </div>
    </div>
  );
}

/** Types `text` into the input at presentation pace, then reports "sent". Skips straight to sent under `instant`. */
function useTypedSend(text: string | null, instant: boolean): { typed: string; sent: boolean } {
  const [typed, setTyped] = useState(instant || !text ? "" : "");
  const [sent, setSent] = useState(!text || instant);

  useEffect(() => {
    if (!text || instant) return;
    setSent(false);
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setTimeout(() => setSent(true), 260);
      }
    }, 26);
    return () => clearInterval(id);
    // Re-run only when the prompt text or instant-mode itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, instant]);

  return { typed, sent };
}

/**
 * Reveals `items` from `revealFrom` one at a time at presentation pace
 * (~0.4s/row); everything before `revealFrom` is already-settled history and
 * renders at once. An item with its own `revealAfterMs` (tool/assistant —
 * types.ts) adds that much extra wait before ITSELF appears, on top of the
 * normal ~0.4s slot — used to hold a chat summary back until a terminal
 * replay it refers to has actually finished.
 */
function useStagger(items: ChatItem[], revealFrom: number, instant: boolean): number {
  const count = items.length;
  const clampedFrom = Math.min(revealFrom, count);
  const [visible, setVisible] = useState(instant ? count : clampedFrom);

  useEffect(() => {
    if (instant) {
      setVisible(count);
      return;
    }
    setVisible(clampedFrom);
    if (clampedFrom >= count) return;
    let cancelled = false;
    let next = clampedFrom;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const extraMs =
        "revealAfterMs" in (items[next] ?? {}) ? (items[next] as { revealAfterMs?: number }).revealAfterMs : undefined;
      timer = setTimeout(
        () => {
          if (cancelled) return;
          next++;
          setVisible(next);
          if (next < count) scheduleNext();
        },
        400 + (extraMs ?? 0),
      );
    };
    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, count, clampedFrom, instant]);

  return visible;
}

export function ChatPanel({
  items,
  revealFrom,
  chatInput,
  instant,
  autoMode,
  showAutoModeToggle,
  sessionTitle,
  onRevealChange,
  modelLabel = "Sonnet 5",
  effortLabel = "High",
}: {
  items: ChatItem[];
  /** Index (into `items`) of the first item this step ADDED over the previous chat-bearing step — everything before it renders at once as settled history. */
  revealFrom: number;
  chatInput?: "typing" | "idle";
  instant: boolean;
  autoMode: boolean;
  showAutoModeToggle: boolean;
  /** The session's own name (VSCodeStep.sessionTitle) — "Untitled" is shown instead until something has actually been sent. */
  sessionTitle?: string;
  /** Reports how many of `items` have been revealed so far, every time that count changes — VSCodeScene.tsx uses this to gate `openFileAtChatIndex` (a file that opens only once the chat panel has actually shown the row that reads it). */
  onRevealChange?: (visibleCount: number) => void;
  /** The model/effort pills under the input — Claude Code's own defaults, not this demo's; override for a run that used a different model or effort level. */
  modelLabel?: string;
  effortLabel?: string;
}): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  // The typed-and-sent prompt is always the NEWEST item (this story types
  // more than one top-level prompt into the same session now — the warm-up
  // question, then the change request) — once sent it's just an ordinary
  // settled history item like any other, and everything BEFORE it is
  // already-settled history that stays on screen while it's being typed.
  const lastItem = items[items.length - 1];
  const typedPrompt = chatInput === "typing" && lastItem?.kind === "user" ? lastItem.text : null;
  const { typed, sent } = useTypedSend(typedPrompt, instant);

  const visibleItems = typedPrompt && !sent ? items.slice(0, -1) : items;
  const effectiveRevealFrom = typedPrompt && !sent ? Math.min(revealFrom, visibleItems.length) : revealFrom;
  const visibleCount = useStagger(visibleItems, effectiveRevealFrom, instant);

  useEffect(() => {
    onRevealChange?.(visibleCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount]);

  // A real Claude Code panel stays pinned to its newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleCount, typed]);

  const renderedItems = visibleItems.slice(0, visibleCount);
  const lastVisible = renderedItems[renderedItems.length - 1];
  const midTyping = !!typedPrompt && !sent;
  const allRevealed = visibleCount >= visibleItems.length;
  const lastBlocksWork =
    lastVisible?.kind === "assistant" ||
    (lastVisible?.kind === "tool" && lastVisible.approval === "pending") ||
    (lastVisible?.kind === "plan-approval" && lastVisible.approval === "pending");
  // A resolved tool row or a user prompt is a plausible "mid-turn" point —
  // the owner review round 4's staged plan (throughPlan in steps.ts) reveals
  // several tool rows one at a time BEFORE the plan text lands, and a real
  // Claude Code panel keeps showing its working status between them, not
  // just after the LAST one.
  const lastIsResolvedToolOrPrompt =
    lastVisible?.kind === "user" || (lastVisible?.kind === "tool" && lastVisible.approval !== "pending");
  // The in-flight status row (WorkingRow) — and the input's streaming look
  // below — show in two cases: (1) everything captured for this step has
  // actually been revealed AND the turn doesn't already look finished (an
  // assistant reply) or paused on a decision (a pending card); (2) mid-way
  // through the stagger, right after a resolved tool row or a user prompt —
  // never right after a "thinking" row, an assistant reply, a result block,
  // or a pending approval card, which would double up with that row's own
  // affordance. `chatInput: "idle"` is an explicit override for the two
  // pending-approval steps either way.
  const working =
    chatInput !== "idle" &&
    !midTyping &&
    renderedItems.length > 0 &&
    ((allRevealed && !lastBlocksWork) || (!allRevealed && lastIsResolvedToolOrPrompt));

  // "Untitled" until this session has actually SENT something (not merely
  // typing it) — a real fresh Claude Code panel shows the same before its
  // first message goes out.
  const shownSessionTitle = renderedItems.length > 0 ? (sessionTitle ?? "Untitled") : "Untitled";

  return (
    <div className="vsc-chatpanel">
      <div className="cc-header">
        <span className="cc-session-title">{shownSessionTitle}</span>
        <span className="cc-header-icons" aria-hidden="true">
          <span className="codicon codicon-list-filter" />
          <span className="codicon codicon-history" />
          <span className="codicon codicon-add" />
        </span>
      </div>

      <div className="cc-scroll" ref={scrollRef}>
        {visibleItems.slice(0, visibleCount).map((item, i, arr) => {
          // The reference draws a thin rail connecting consecutive
          // "thinking"/tool/assistant dots within one turn (ref15-dots.png)
          // — never into or out of a user bubble or a result block, which
          // have no dot of their own.
          const railed = item.kind === "thinking" || item.kind === "tool" || item.kind === "assistant";
          const next = arr[i + 1];
          const nextRailed = next && (next.kind === "thinking" || next.kind === "tool" || next.kind === "assistant");
          const railClass = railed && nextRailed ? "cc-rail-down" : "";

          if (item.kind === "user") {
            return (
              <div key={i} className="cc-row cc-row-user">
                <UserBubble text={item.text} />
              </div>
            );
          }
          if (item.kind === "thinking") {
            return (
              <div key={i} className={`cc-row cc-row-thinking ${railClass}`}>
                <span className="cc-dot cc-dot-grey" aria-hidden="true" />
                {/* No duration — nothing in the capture measures pre-tool-call thinking time. */}
                <span className="cc-thinking-text">Thinking…</span>
              </div>
            );
          }
          if (item.kind === "assistant") {
            return (
              <div key={i} className={`cc-row cc-row-assistant ${railClass}`}>
                <span className="cc-dot cc-dot-grey" aria-hidden="true" />
                <div className="cc-row-body cc-prose">
                  <MarkdownLite text={item.text} />
                </div>
              </div>
            );
          }
          if (item.kind === "result") {
            return (
              <div key={i} className={`cc-row cc-row-result ${item.tone === "error" ? "cc-result-error" : ""}`}>
                <pre>{item.text}</pre>
              </div>
            );
          }
          if (item.kind === "plan-approval") {
            return <PlanApprovalRow key={i} item={item} />;
          }
          const isPending = item.approval === "pending";
          // Each step ever shows at most one pending card (an earlier one
          // is always "resolved" by the time a later one appears), so one
          // fixed hotspot id covers all three approval steps — no counter
          // needed, and nothing for pendingIndex to get out of sync with.
          return (
            <ToolRow
              key={i}
              item={item}
              resolved={!isPending}
              hotspotId={isPending ? "chat-approve" : undefined}
              railClass={railClass}
            />
          );
        })}
        {working && <WorkingRow />}
      </div>

      <ChatInput
        placeholder={typedPrompt && !sent ? "" : working ? "Queue another message…" : "Ask Claude to edit…"}
        value={typedPrompt && !sent ? typed : ""}
        typing={!!typedPrompt && !sent}
        streaming={working}
        // The border stays warm once the session has ANY history — verified
        // against ref15 (a just-finished turn) and ref23 (the whole window,
        // captured last): both still show it, with "Ask Claude to edit…"
        // back as the placeholder, so it isn't a busy indicator at all.
        active={visibleItems.length > 0}
        autoMode={autoMode}
        showAutoModeToggle={showAutoModeToggle}
        modelLabel={modelLabel}
        effortLabel={effortLabel}
      />
    </div>
  );
}

/** A bordered, left-aligned, full-width box (NOT a filled chat bubble — ref15-dots.png shows a plain outline on the page's own background); a 3+ line prompt fades out with a "Show more" link, per the reference's truncated-prompt echo. */
function UserBubble({ text }: { text: string }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n");
  const needsCollapse = lines.length > 3 && !expanded;
  return (
    <div className={`cc-user-bubble ${needsCollapse ? "cc-user-bubble-clamped" : ""}`}>
      <pre>{text}</pre>
      {lines.length > 3 && (
        <button type="button" className="cc-show-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/** The reference's input chrome: icon row, model/effort pills, mic — orange border + stop square while the agent works, normal grey border + send arrow otherwise. */
function ChatInput({
  placeholder,
  value,
  typing,
  streaming,
  active,
  autoMode,
  showAutoModeToggle,
  modelLabel,
  effortLabel,
}: {
  placeholder: string;
  value: string;
  typing: boolean;
  streaming: boolean;
  /** Border stays this session's warm accent once there's ANY history — independent of `streaming`, see the comment where this is passed in. */
  active: boolean;
  autoMode: boolean;
  showAutoModeToggle: boolean;
  modelLabel: string;
  effortLabel: string;
}): React.JSX.Element {
  return (
    <div className="cc-inputwrap">
      {/* One bordered box holds the text area AND the icon/send row (ref02-input.png,
          ref20-input-full.png): an internal divider line separates them, and the
          border itself — not just the send button — carries the warm accent. The
          model/effort pills sit in their OWN row, outside this border. */}
      <div className={`cc-input ${active ? "cc-input-active" : ""}`}>
        <div className="cc-input-text">
          {value ? value : <span className="cc-input-placeholder">{placeholder}</span>}
          {typing && <span className="cc-caret" aria-hidden="true" />}
        </div>
        <span className="codicon codicon-mic cc-input-mic" aria-hidden="true" />
        <div className="cc-input-divider" aria-hidden="true" />
        <div className="cc-input-toolbar">
          <span className="cc-input-icons" aria-hidden="true">
            <span className="codicon codicon-add" />
            <span className="codicon codicon-symbol-file" />
            <span className="codicon codicon-zap" />
          </span>
          {streaming ? (
            <span className="cc-send cc-send-stop" aria-hidden="true">
              <span className="codicon codicon-primitive-square" />
            </span>
          ) : (
            <span className="cc-send" aria-hidden="true">
              <span className="codicon codicon-arrow-up" />
            </span>
          )}
        </div>
      </div>
      <div className="cc-pills-row">
        <span className="cc-pill">{modelLabel}</span>
        <span className="cc-pill">{effortLabel}</span>
      </div>
      {/* Auto mode is this DEMO's own device (steps.ts/DiagramScene's "the
          human moves from approving each step to approving the whole
          loop") — the real extension has no such toggle in this panel. Its
          OWN row (nothing beside it) so the hotspot's floating label has a
          clear lane above it instead of landing on the Sonnet 5/High pills
          it used to share a row with. */}
      <div className={`cc-automode-row ${showAutoModeToggle ? "cc-automode-row-spaced" : ""}`}>
        <span className="cc-automode">
          <span className="cc-automode-label">Auto</span>
          {showAutoModeToggle ? (
            <Hotspot id="chat-automode-toggle">
              <span className={`cc-automode-switch ${autoMode ? "on" : ""}`}>
                <span className="cc-automode-knob" />
              </span>
            </Hotspot>
          ) : (
            <span className={`cc-automode-switch ${autoMode ? "on" : ""}`}>
              <span className="cc-automode-knob" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
