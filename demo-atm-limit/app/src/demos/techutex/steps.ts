/**
 * The whole story, as data. Every scene reads its own slice of a Step and
 * ignores the rest. Chat/tool-card bodies quote the real captured run
 * (captures/run1) — see CAPTURES in ../../generated/techutex/captures, and
 * session/claude-session.jsonl (the real transcript, delivered in a second
 * pass) for the assistant's own words. Five assistant lines below are
 * VERBATIM quotes from that transcript (each marked "verbatim" at its own
 * definition); every other assistant line is marked "narrative", a
 * paraphrase in this app's own voice.
 *
 * IMPORTANT: the run was a REHEARSAL, in auto permission mode. The only
 * real user message was "Let's prepare a great demo script…" — the ticket
 * in session/prompt.md was never actually typed as a message, and no
 * approval prompt ever appeared (auto mode approves everything silently).
 * This demo still STAGES the ticket prompt, the plan-approval card and the
 * host-write-approval card, because showing a developer approve each step
 * is the story — each is marked "// narrative: staged — the run was a
 * self-directed rehearsal in auto mode (transcript)" at its own definition.
 *
 * Every MCP tool row not marked `invented:false` in
 * session/mcp/endevor-tools.json or listed as a real `hb` command in
 * session/hb-log.txt carries `badge: "proposed"` — see FACTS.md's "What's
 * real vs what's faked/invented" section, which this file follows exactly.
 * A row whose TOOL is real but whose CALL was never made in the recorded
 * run (the plan-grounding search/read rows, owner's review round 2) carries
 * `badge: "staged"` instead, and its OUT is derived from the captured
 * source, never invented text — each one says so in its own comment.
 * Product naming: the official name is "HostBridge JavaScript Engine (HB.js)"
 * (Broadcom's own HB.js 8.0 documentation, Getting Started); the long form
 * appears once per slide where it is first mentioned, "HB.js" elsewhere.
 * `mcp.server` is always a STAGE DISPLAY NAME ("Endevor MCP", "HB.js MCP",
 * "Zowe MCP"), never the real server package id (`code4z-cowboys`) — the
 * real id lives in a comment at each first use.
 * Nothing rendered here may show a workspace path — REDACTIONS.md's import
 * note says every real path in the transcript was scrubbed and even the
 * scrubbed form must not appear; element names and repo-relative paths only
 * (e.g. "ais-cam-dot/src/dot/files/cobol/DOT500").
 */
import { CAPTURES } from "../../generated/techutex/captures";
import {
  MANUAL_HAND_TESTED,
  MANUAL_WITH_TESTS,
  sumKinds,
  kindTotal,
  formatHalfHour,
  formatHumanRounded,
} from "./manualTimings";
import { agentLoopTotalMs, msSinceLoopStart, durationBetween } from "./agentLoopTiming";
import { TECHUTEX_RATIO } from "./compare";
import { DAILY_LIMIT, DEMO_DEBIT_AMOUNT, DEMO_ATM_BRAND } from "./config";
import { REPLAY_MS_PER_LINE } from "../../kit/engine/pacing";
import type { ChatItem, Step, Diagnostic } from "../../kit/engine/types";

function replayDurationMs(key: keyof typeof CAPTURES.logs): number {
  return CAPTURES.logs[key].split("\n").length * REPLAY_MS_PER_LINE;
}

function endevorCall(tool: string): (typeof CAPTURES.endevorCalls)[number] {
  const call = CAPTURES.endevorCalls.find((c) => c.tool === tool);
  if (!call) throw new Error(`no captured endevor-calls.jsonl row for tool "${tool}"`);
  return call;
}
function endevorCallAt(tool: string, epochMs: number): (typeof CAPTURES.endevorCalls)[number] {
  const call = CAPTURES.endevorCalls.find((c) => c.tool === tool && c.epochMs === epochMs);
  if (!call) throw new Error(`no captured endevor-calls.jsonl row for tool "${tool}" at ${epochMs}`);
  return call;
}

const WARMUP_PROMPT = "What tests do we have for the ATM?";
const RUN_TESTS_PROMPT = "Run the tests";
// A narrative paraphrase of session/prompt.md — shorter, framed as the
// start of a session, matching DOGECICS's own steps.ts precedent for the
// ticket prompt (a condensed re-telling rather than the raw file, which the
// "ticket" step's own caption/hotspot-free reading already shows in full
// via PLAN_TEXT/the plan step).
const NEW_PROMPT =
  "New ticket: reject a debit if the account's accumulated debit total for the day would exceed a configured " +
  `default $${DAILY_LIMIT.toLocaleString()}.00 limit. Today DOT500 accepts any valid debit. Work test-first, ` +
  "show me your plan before changing anything."; // owner text edit, review round 10

const WARMUP_SESSION_TITLE = "Tests for the ATM";
const TICKET_SESSION_TITLE = "Daily debit limit";

const promptWarmup: ChatItem = { kind: "user", text: WARMUP_PROMPT, typed: true };
const promptRunTests: ChatItem = { kind: "user", text: RUN_TESTS_PROMPT, typed: true };
const promptChange: ChatItem = { kind: "user", text: NEW_PROMPT, typed: true };
const thinkingItem: ChatItem = { kind: "thinking" };
const thinkingItem2: ChatItem = { kind: "thinking" };
const thinkingItem3: ChatItem = { kind: "thinking" };

// ---- warm-up (owner's review round 2 reorder): AGENTS first (real tool,
// readAgentsChat above), then HB.js MCP hbScriptList — INVENTED (no HB.js
// MCP server exists — session/mcp/hb-mcp-proposal.md); its OUTPUT is the
// real `hb script list` lines from session/hb-log.txt — then Read
// DOTREGRT, then the answer. "HB.js MCP" is a stage display name; the
// invented real id would have been "hbjs-mcp". ----
const hbScriptListChat: ChatItem = {
  kind: "tool",
  tool: "Search",
  title: "HB.js scripts",
  mcp: { server: "HB.js MCP", tool: "hbScriptList" },
  badge: "proposed",
  input: "{}",
  output: CAPTURES.logs["hb-log"].split("\n").slice(1, 4).join("\n"),
  approval: "resolved",
};
const readRegressionTestChat: ChatItem = { kind: "tool", tool: "Read", title: "DOTREGRT", approval: "resolved" };
// narrative: draft, pending the transcript.
const assistantWarmupAnswer: ChatItem = {
  kind: "assistant",
  text:
    "AGENTS.md points at the tests: JS elements in BANKING/DOT. One regression check already exists — " +
    "`dot.regression.test.js` (Endevor element `DOTREGRT`), wrapping the `getCheckingBalances` HB.js script, a " +
    "plain account inquiry orthogonal to any debit-posting change. It runs against the live CICS region.",
};

const bashRunRegressionChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Run the regression test",
  input: "node tests/dot.regression.test.js",
  output: CAPTURES.logs["run-1-regression"],
  approval: "resolved",
};
// narrative: draft, pending the transcript. Held back until the terminal
// panel's own replay of this same run has actually finished scrolling.
const assistantRegressionSummary: ChatItem = {
  kind: "assistant",
  text:
    "PASS: basic account inquiry returns SUCCESS, live against the CICS region — WILLIAMS ROBT, account 1-01-123456, " +
    "available balance $926.00. Whatever the daily-limit change does to DOT500, this check has to stay green.",
  revealAfterMs: replayDurationMs("run-1-regression"),
};

// ---- (d) the plan — condensed from session/plan.md's real 7 numbered
// steps into headed prose, the same treatment DOGECICS's steps.ts gives
// plan.md, so markdownLite.tsx's #/##/### renders real headings. ----
const PLAN_TEXT = `## Plan: daily debit limit
**Where:** \`DOT500\` (transaction \`DOT5\`), a new \`4100-CHECK-DAILY-LIMIT\` section.
### 1. Tests first
\`dot.dailyLimit.test.js\` (HB.js, wraps \`postDebit\`): a modest debit must come back REJECTED with "LIMIT EXCEEDED". Run it now — RED, the rule doesn't exist yet.
### 2. Retrieve, then change DOT500
- Retrieve from Endevor: \`DEV/1/BANKING/DOT/COBPGM/DOT500\`.
- A limit + two work fields, and \`4100-CHECK-DAILY-LIMIT\` reusing DOT200's \`RETURN-HEADER\` service — the exact pattern DOT400 already uses for its own totals.
- If today's accumulated debits + this one exceed $${DAILY_LIMIT.toLocaleString()}.00, reject with \`ERROR: DAILY DEBIT LIMIT EXCEEDED\` and re-show the screen.
### 3. Generate and verify
Update the element, generate (compile+link), fix and regenerate on any failure — keep every listing. Deploy to the CICS region, then re-run both tests: regression still green, the new one now REJECTED.`;

// ---- Plan grounding (owner's review round 2, +1 row review round 5): five
// real Endevor MCP tool calls (search_elements_content, get_element_content
// — confirmed real per the transcript's own ToolSearch) that GROUND the
// plan in the actual source, but none of these five particular calls were
// made in the recorded run — each carries badge:"staged". Their OUT text is
// derived from what this archive actually has: DOT500.v0.cbl (grepped for
// real), never invented source for DOT400/DOT200 (not in the archive). ----
const searchInsertTransactionChat: ChatItem = {
  kind: "tool",
  tool: "Search",
  title: '"4000-INSERT-TRANSACTION" across BANKING/DOT',
  mcp: { server: "Endevor MCP", tool: "search_elements_content" },
  badge: "staged",
  input: 'text: "4000-INSERT-TRANSACTION", system: "BANKING", subsystem: "DOT", type: "COBPGM"',
  // Real: DOT500.v0.cbl contains this section header (grepped) — not
  // claiming it's the ONLY match, just that DOT500 is A real one.
  output: "DOT500 — match (see 4000-INSERT-TRANSACTION SECTION)",
  approval: "resolved",
};
// narrative: staged — not called in the run; output derived from the
// captured source. DOT400/DOT200 source isn't in this archive, so their
// rows show a retrieval summary, never invented content.
const readDot400Chat: ChatItem = {
  kind: "tool",
  tool: "Read",
  title: "DOT400 (the pattern the plan cites)",
  mcp: { server: "Endevor MCP", tool: "get_element_content" },
  badge: "staged",
  input: 'element: "DOT400", type: "COBPGM", environment: "DEV", stageNumber: "1", system: "BANKING", subsystem: "DOT"',
  approval: "resolved",
};
// narrative: staged — not called in the run; output derived from the
// captured source.
const readDot200Chat: ChatItem = {
  kind: "tool",
  tool: "Read",
  title: "DOT200 (RETURN-HEADER)",
  mcp: { server: "Endevor MCP", tool: "get_element_content" },
  badge: "staged",
  input: 'element: "DOT200", type: "COBPGM", environment: "DEV", stageNumber: "1", system: "BANKING", subsystem: "DOT"',
  approval: "resolved",
};
// narrative: staged — not called in the run; output derived from the
// captured source. get_element_dependencies is NOT a real tool on this
// server — a search for the real dependency-shaped text in DOT500.v0.cbl
// stands in for it instead (both real matches, grepped: COPY DOTCONS. at
// line 172, and the two EXEC CICS LINK PROGRAM(...) calls DOT500 makes —
// DOT-SERVICE-PROGRAM is a variable, never the literal string "DOT200", so
// this searches the LINK verb itself, not an invented literal).
const searchDependenciesChat: ChatItem = {
  kind: "tool",
  tool: "Search",
  title: "copybooks + LINK calls in DOT500",
  mcp: { server: "Endevor MCP", tool: "search_elements_content" },
  badge: "staged",
  input: 'text: "COPY DOTCONS" | "EXEC CICS LINK PROGRAM", element: "DOT500"',
  output: "DOT500 — COPY DOTCONS. (1 match); EXEC CICS LINK PROGRAM (2 matches)",
  approval: "resolved",
};
// narrative: staged — owner review round 5: the reverse dependency question
// (who calls DOT500) before the plan; not called in the run, output not in
// this archive.
const searchReverseDependenciesChat: ChatItem = {
  kind: "tool",
  tool: "Search",
  title: "programs that LINK to DOT500",
  mcp: { server: "Endevor MCP", tool: "search_elements_content" },
  badge: "staged",
  input: 'text: "DOT500", system: "BANKING", subsystem: "DOT", type: "COBPGM"',
  approval: "resolved",
};

const assistantPlanChat: ChatItem = { kind: "assistant", text: PLAN_TEXT };
const planApprovalPending: ChatItem = { kind: "plan-approval", approval: "pending" };

// narrative: draft, pending the transcript.
const assistantImplementingChat: ChatItem = {
  kind: "assistant",
  text: "Implementing the plan. First: a test for the rule that doesn't exist yet, so I can watch it fail.",
};
const writeLimitTestChat: ChatItem = {
  kind: "tool",
  tool: "Write",
  title: "DOTDLIMT",
  mcp: { server: "Endevor MCP", tool: "update_element" },
  badge: "proposed",
  input: 'element: "DOTDLIMT", type: "JS", system: "BANKING", subsystem: "DOT", stageNumber: "1"',
  output: 'dot.dailyLimit.test.js — wraps postDebit amount=50.00, asserts REJECTED + "LIMIT EXCEEDED"',
  approval: "resolved",
};

// ---- The honest small beat (real, from the transcript): the FIRST run of
// the two new test files failed on a bug in the TESTS themselves — a wrong
// call-signature into hb-cli's real runScript() helper — not on DOT500.
// No literal console text survived into this archive slice, so the tool
// row's own output is a factual, non-verbatim description, said so below;
// the two "String to replace not found" retries the fix itself hit are
// omitted here (real, but not part of the story). ----
const bashFirstRunChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Run the new tests",
  input: "node tests/dot.regression.test.js; echo exit=$?\nnode tests/dot.dailyLimit.test.js 50.00; echo exit=$?",
  // verbatim: the two tool results in claude-session.jsonl (16:40:35, 16:40:36).
  output:
    "$ hb script run getCheckingBalances account=101123456\nnull\nFAIL: basic account inquiry did not return the expected result\nexit=1\n" +
    '$ hb script run postDebit amount=50.00\nnull\nFAIL: expected status REJECTED with "LIMIT EXCEEDED", got status=null\nexit=1',
  approval: "resolved",
  durationMs: durationBetween("tests-new-written", "tests-first-run-bug"),
};
// narrative: draft.
const assistantFirstRunBugChat: ChatItem = {
  kind: "assistant",
  text: "Both new tests threw before ever reaching the host — a call-signature mismatch with hb-cli's real runScript(). Reading the real client instead of guessing.",
};
const readClientJsChat: ChatItem = { kind: "tool", tool: "Read", title: "hb-cli/lib/client.js", approval: "resolved" };
const fixTestsChat: ChatItem = {
  kind: "tool",
  tool: "Edit",
  title: "dot.regression.test.js + dot.dailyLimit.test.js",
  output: "runScript(config, { name, query }) — both tests were calling it with the wrong shape",
  approval: "resolved",
  durationMs: durationBetween("tests-first-run-bug", "tests-new-fixed"),
};

const bashRedRunChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Run the new test",
  input: "node tests/dot.dailyLimit.test.js 50.00",
  output: CAPTURES.logs["run-2-new-test-red"],
  approval: "resolved",
  durationMs: durationBetween("tests-new-fixed", "tests-new-run"),
};
// narrative: draft, pending the transcript.
const assistantRedSummaryChat: ChatItem = {
  kind: "assistant",
  text:
    'FAIL, for the right reason: status ACCEPTED, "TRANSACTION INSERTED SUCCESSFULLY" — DOT500 has no daily ' +
    "limit yet. Now the COBOL.",
  revealAfterMs: replayDurationMs("run-2-new-test-red"),
};

// narrative: owner review round 4 — the agent says why it reads AGENTS
// first, ahead of the readAgentsChat tool row below. Shared by the warm-up
// (warmup-agents/warmup-answer/warmup-run-prompt/warmup-run) and, via
// throughPlan (below the STEPS array's own helper consts), every
// ticket-session step from "plan" on.
const assistantWarmupWhyAgentsChat: ChatItem = {
  kind: "assistant",
  text: "Let me read AGENTS first — the project's notes for AI assistants, kept as an Endevor element — to see where the tests live and how they are run.",
};

// ---- AGENTS.md is a REAL tool (get_element_content, type MD) reading OUR
// OWN draft content (captures/run1/code/AGENTS.md — see CAPTURES-WANTED.md's
// "Provenance notes"). Owner's review round 2: this is now the FIRST tool
// call of the warm-up too (the same item, reused there and in the "plan"
// step onward). Owner's review round 4: the standalone "read-agents" step
// this comment used to also cite was removed ("No need for agents md now.
// We have seen it before.") — readAgentsChat now appears only in the
// warm-up and once per ticket-session step's shared prefix (throughPlan).
// Server "Endevor MCP" is a stage display name — the real id is
// code4z-cowboys. ----
const readAgentsChat: ChatItem = {
  kind: "tool",
  tool: "Read",
  title: "AGENTS",
  mcp: { server: "Endevor MCP", tool: "get_element_content" },
  input: 'element: "AGENTS", type: "MD", environment: "DEV", stageNumber: "1", system: "BANKING", subsystem: "DOT"',
  approval: "resolved",
};
// narrative: owner review round 4 — renamed from assistantAgentsRuleChat and
// shortened (the AGENTS.md summary it used to carry is now readAgentsChat's
// own job, read once per session via throughPlan/the warm-up, not restated
// here).
const assistantRetrieveChat: ChatItem = {
  kind: "assistant",
  text: "Retrieving DOT500 to find where to add the check.",
};

// ---- read-sources: REAL get_elements + get_element_content calls. ----
const getElementsChat: ChatItem = {
  kind: "tool",
  tool: "Read",
  title: "DOT500 (metadata)",
  mcp: { server: "Endevor MCP", tool: "get_elements" },
  input: JSON.stringify(endevorCall("get_elements").input),
  output: JSON.stringify(endevorCall("get_elements").output, null, 2),
  approval: "resolved",
  // No separate timestamp for get_elements alone — timings.jsonl's single
  // "read-sources" stage covers both this call and get_element_content
  // together, so the real gap is shown on the heavier of the two below.
};
const getElementContentChat: ChatItem = {
  kind: "tool",
  tool: "Read",
  title: "DOT500 (source)",
  mcp: { server: "Endevor MCP", tool: "get_element_content" },
  input: JSON.stringify(endevorCall("get_element_content").input),
  // No OUT box: the capture's own `output` field for this call is the
  // collecting session's placeholder ("[1566-line COBOL source, truncated
  // …]"), not tool output — the source itself opens in the editor.
  approval: "resolved",
  durationMs: durationBetween("tests-new-run", "read-sources"),
};

// verbatim (session/claude-session.jsonl) — one phrase changed by the owner,
// review round 4: "the workshop doc" -> "the plan".
const assistantChangeChat: ChatItem = {
  kind: "assistant",
  text: "Now applying the three edits exactly as specified in the plan.",
};
// Owner's review round 2: NO local edit row — the change is carried by the
// update_element call itself (updateElementChat, below, the host-write-
// approval card). The diff-v0-v1 step still shows the change, in the
// EDITOR's own diff pane (Step.vscode.diffOf), just not as a separate chat
// row anymore.

// narrative: owner's own wording, review round 4.
const assistantDiagnosticsChat: ChatItem = {
  kind: "assistant",
  text: "COBOL Language Support provides information about syntax errors. I will resolve them before updating the element in Endevor.",
};

// The three real IGYDS diagnostics (LineID 175/180/180 in the real
// listing) mapped onto DOT500.v1.cbl's OWN line 175/180 — confirmed by
// grepping v1.cbl: line 175 is "01  WS-DAILY-LIMIT-CONTROL." (an 01 level
// that drifted out of Area A), line 180 is "COPY DOTCONS." (its leading
// spaces landing on column 7).
const V1_DIAGNOSTICS: Diagnostic[] = [
  {
    line: 175,
    severity: "error",
    message: '"01" should begin in area "A". It was processed as if found in area "A".',
    source: "COBOL Language Support",
    code: "IGYDS0017-E",
  },
  {
    line: 180,
    severity: "error",
    message: 'A character other than "*", "D", "/" or "-" was found in column 7. A blank was assumed.',
    source: "COBOL Language Support",
    code: "IGYDS0002-E",
  },
  {
    line: 180,
    severity: "error",
    message: '"DOTCONS" should not begin in area "A". It was processed as if found in area "B".',
    source: "COBOL Language Support",
    code: "IGYDS0009-E",
  },
];

// narrative: staged — the run was a self-directed rehearsal in auto mode
// (transcript). The real run never paused for a host-write approval.
const assistantHostWriteChat: ChatItem = {
  kind: "assistant",
  text: "Ready to update DOT500 in Endevor and generate it. This writes to a shared inventory, so I'm asking first.",
};
// Owner's review round 2: this update_element call now carries the change
// itself (its own `output`) — the demo has no separate local Edit row.
const updateElementChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Update DOT500 in Endevor",
  mcp: { server: "Endevor MCP", tool: "update_element" },
  badge: "proposed",
  input: JSON.stringify(endevorCall("update_element").input, null, 2),
  output:
    "WS-DAILY-LIMIT-CONTROL, the limit check ahead of 4000-INSERT-TRANSACTION, 4100-CHECK-DAILY-LIMIT — see the diff",
  approval: "pending",
  // No separate host-write timestamp exists in timings.jsonl — the next
  // real stamp is generate-1 (generate1Chat below), which carries the gap.
  durationMs: durationBetween("read-sources", "edit-v1"),
};
// verbatim (session/claude-session.jsonl) — trimmed of a trailing
// capture-beat clause after "listing", per the coordinator's instruction.
const assistantBeforeGenerate1Chat: ChatItem = {
  kind: "assistant",
  text:
    "Good — the diff is exactly the workshop's intended change (line lengths all under 72). Now let's build via " +
    "`syncz` for a genuine compile listing",
};

const generate1Chat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Generate DOT500 (compile + link)",
  mcp: { server: "Endevor MCP", tool: "generate_element" },
  badge: "proposed",
  input: JSON.stringify(endevorCallAt("generate_element", 1790351050000).input, null, 2),
  output: CAPTURES.listings.generate1.lines.join("\n"),
  approval: "resolved",
  durationMs: durationBetween("edit-v1", "generate-1"),
};
const rc12Result1Chat: ChatItem = {
  kind: "result",
  tone: "error",
  text: `Return code ${CAPTURES.listings.generate1.returnCode}`,
};
// narrative: draft, pending the transcript.
const rc12Assistant1Chat: ChatItem = {
  kind: "assistant",
  text:
    'RC 12 — IGYDS0017-E: the new "01 WS-DAILY-LIMIT-CONTROL" drifted into Area B. Fixed-format COBOL, columns ' +
    "8-72 — realigning it and the COPY statement right after it into Area A.",
};

// Owner's review round 2: the SECOND fix (fixing the 01-level, still
// missing the COPY column-7 issue) is an update_element call too — no
// local edit.
const updateElementV2Chat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Update DOT500 in Endevor",
  mcp: { server: "Endevor MCP", tool: "update_element" },
  badge: "proposed",
  input: JSON.stringify(
    { element: "DOT500", environment: "DEV", stageNumber: "1", system: "BANKING", subsystem: "DOT", type: "COBPGM" },
    null,
    2,
  ),
  output: "01-level realigned to Area A — COPY DOTCONS. still has a leftover column-7 overlap",
  approval: "resolved",
  durationMs: durationBetween("generate-1", "edit-v2"),
};

const generate2Chat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Regenerate DOT500",
  mcp: { server: "Endevor MCP", tool: "generate_element" },
  badge: "proposed",
  input: JSON.stringify(
    { element: "DOT500", environment: "DEV", stageNumber: "1", system: "BANKING", subsystem: "DOT", type: "COBPGM" },
    null,
    2,
  ),
  output: CAPTURES.listings.generate2.lines.join("\n"),
  approval: "resolved",
  durationMs: durationBetween("edit-v2", "generate-2"),
};
const rc12Result2Chat: ChatItem = {
  kind: "result",
  tone: "error",
  text: `Return code ${CAPTURES.listings.generate2.returnCode}`,
};
// narrative: draft, pending the transcript.
const rc12Assistant2Chat: ChatItem = {
  kind: "assistant",
  text:
    "RC 12 again — the 01 level is fixed, but the `COPY DOTCONS.` right after it still has a stray leading space " +
    "landing on column 7 (IGYDS0002-E), which knocks the whole COPY out of Area A too. Fixing the indentation and " +
    "regenerating.",
};

// Owner's review round 2: the THIRD fix (the settled v2) is update_element
// too.
const updateElementV3Chat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Update DOT500 in Endevor",
  mcp: { server: "Endevor MCP", tool: "update_element" },
  badge: "proposed",
  input: JSON.stringify(
    { element: "DOT500", environment: "DEV", stageNumber: "1", system: "BANKING", subsystem: "DOT", type: "COBPGM" },
    null,
    2,
  ),
  output: "01-level and COPY DOTCONS. realigned to Area A — see the diff (v0 → v2, the settled fix)",
  approval: "resolved",
  durationMs: durationBetween("generate-2", "edit-v3"),
};
// verbatim (session/claude-session.jsonl).
const assistantBeforeGenerate3Chat: ChatItem = {
  kind: "assistant",
  text: "Good, COPY now starts at column 12 (11 leading spaces), blank indicator column 7. Rebuild.",
};
const generate3Chat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Regenerate DOT500",
  mcp: { server: "Endevor MCP", tool: "generate_element" },
  badge: "proposed",
  input: JSON.stringify(endevorCallAt("generate_element", 1790351293000).input, null, 2),
  output: CAPTURES.listings.generate3.lines.join("\n"),
  approval: "resolved",
  durationMs: durationBetween("edit-v3", "generate-3"),
};
const rc0ResultChat: ChatItem = { kind: "result", tone: "ok", text: "Return code 0 — build succeeded." };
// narrative: the owner's wording (review round 6) — the run's own line was
// "Green build. Now save v2 (working) snapshot and deploy." (session/claude-session.jsonl).
const assistantBeforeDeployChat: ChatItem = {
  kind: "assistant",
  text: "Build successful. Let's deploy it to the test CICS region.",
};

// Owner's review round 2: deploy is a JCL job through Zowe MCP, not a local
// Bash `syncz` call — submit_job is proposed (no Zowe MCP server exists for
// this run; the real deploy went through `syncz task deploy`, see the real
// deploy-log.txt output below). The data set name USER.CICS.JCL(DEPLOY) is
// THIS DEMO'S OWN assumption — the archive doesn't name a JCL library, only
// the load-module target (shown generically below too, in the real
// deploy-log text).
//
// The deploy log reads with generic host, userid, dataset and region names:
// the capture files themselves carry them in this public repository (see
// captures/run1/REDACTIONS.md), so no display-time substitution is needed.
const deployChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Submit DEPLOY JCL from USER.CICS.JCL",
  mcp: { server: "Zowe MCP", tool: "submit_job" },
  badge: "proposed",
  input: 'dataset: "USER.CICS.JCL(DEPLOY)"',
  output: CAPTURES.logs["deploy-log"],
  approval: "resolved",
  durationMs: durationBetween("generate-3", "deploy"),
};
// verbatim (session/claude-session.jsonl).
const assistantAfterDeployChat: ChatItem = {
  kind: "assistant",
  text:
    "Deployed with `CEMT SET PROG(DOT500) PHASEIN`, no region restart. Now re-run both tests — expecting " +
    "regression PASS and daily-limit test now PASS (green).",
};

const runRegressionAfterChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Run the regression test",
  input: "node tests/dot.regression.test.js",
  output: CAPTURES.logs["run-3-regression-after"],
  approval: "resolved",
};
const runNewTestGreenChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Run the new test",
  input: "node tests/dot.dailyLimit.test.js 50.00",
  output: CAPTURES.logs["run-4-new-test-green"],
  approval: "resolved",
  durationMs: durationBetween("deploy", "tests-run-green"),
};
// narrative: draft, pending the transcript. Held back until BOTH terminal
// replays this refers to have actually finished.
const assistantGreenSummaryChat: ChatItem = {
  kind: "assistant",
  text:
    'Both green: the regression check unchanged, the new one now REJECTED with "ERROR: DAILY DEBIT LIMIT ' +
    "EXCEEDED\". One honesty note: `WS-CUTOFF-DATE` is a fixed sentinel in this version, so today's limit is " +
    "really a lifetime accumulated-debit limit, not a strict daily one — a true daily window (computing " +
    "yesterday's date) is the next ticket, not this one.",
  revealAfterMs: replayDurationMs("run-3-regression-after") + replayDurationMs("run-4-new-test-green"),
};

// ---- process step: per-node time estimates sliced from
// MANUAL_HAND_TESTED's nine stages (manualTimings.ts), same treatment as
// DOGECICS's steps.ts. ----
const [mtRetrieve, mtRead, mtDesign, mtWriteChange, mtRound1, mtRound2, mtRound3, mtDeploy, mtHandTest] =
  MANUAL_HAND_TESTED;

const retrieveOpenMin = kindTotal(sumKinds([mtRetrieve]));
const readCodeMin = kindTotal(sumKinds([mtRead]));
const designMin = kindTotal(sumKinds([mtDesign]));
const editMin = kindTotal(sumKinds([mtWriteChange]));
const round1Min = kindTotal(sumKinds([mtRound1]));
const round2Min = kindTotal(sumKinds([mtRound2]));
const round3Min = kindTotal(sumKinds([mtRound3]));
const deployMin = kindTotal(sumKinds([mtDeploy]));
const handTestMin = kindTotal(sumKinds([mtHandTest]));
// The loop-back's cost is a RANGE: best case one more compile round
// (round 3's own mechanics+thinking alone), worst case what this run
// actually hit (round 2's full cost stacked on round 3's).
const rcLoopMinLow = round3Min;
const rcLoopMin = round2Min + round3Min;
const rcLoopLabel = `+ ${formatHumanRounded(rcLoopMinLow)} – ${formatHumanRounded(rcLoopMin)}`;

const handTestedTotalMin = kindTotal(sumKinds(MANUAL_HAND_TESTED));
const withTestsTotalMin = kindTotal(sumKinds(MANUAL_WITH_TESTS));
const leftSummary = `≈ ${formatHalfHour(handTestedTotalMin)} with manual tests · ${formatHalfHour(withTestsTotalMin)} including test authoring`;
const leftSummarySub = `happy path — every fixed-format slip adds a generate round (${rcLoopLabel}) — ALL ESTIMATED, see manualTimings.ts`;

const PROCESS_REVEAL_MS = 260;
const MANUAL_REVEAL_SLOWDOWN = 5;

const agentLoopMin = agentLoopTotalMs() / 60000;
// Owner review round 5: "~ N minutes" instead of the exact measured
// mm:ss — still rounded FROM the measurement, never hand-typed.
const rightSummarySub = `~ ${Math.round(agentLoopMin)} minutes on the last slide`;

// ---- Owner review round 4: the plan now takes visible work — real tool
// rows (grounding it in the actual source) reveal one at a time BEFORE the
// plan text itself, instead of the plan appearing instantly. Each gets a
// revealAfterMs stagger delay (PACING, not a measurement — nothing in the
// capture times these individually, unlike `durationMs` elsewhere in this
// file, which stays absent here). Owner review round 5: "make the analysis
// before the plan is prepared slower" — six tool rows now (the reverse-
// dependency search added below) with wider, varied delays, so the
// row-by-row reveal takes roughly 18-20s by the time assistantPlanChat
// lands (was ~10s in round 4). ----
const readAgentsChatPlan: ChatItem = { ...readAgentsChat, revealAfterMs: 2600 };
const searchInsertTransactionChatPlan: ChatItem = { ...searchInsertTransactionChat, revealAfterMs: 3000 };
const readDot400ChatPlan: ChatItem = { ...readDot400Chat, revealAfterMs: 2400 };
const readDot200ChatPlan: ChatItem = { ...readDot200Chat, revealAfterMs: 2900 };
const searchDependenciesChatPlan: ChatItem = { ...searchDependenciesChat, revealAfterMs: 2500 };
const searchReverseDependenciesChatPlan: ChatItem = { ...searchReverseDependenciesChat, revealAfterMs: 3100 };
const assistantPlanChatPaced: ChatItem = { ...assistantPlanChat, revealAfterMs: 3500 };

// ---- Shared chat-array prefixes for the ticket session (owner review round
// 4, +1 row review round 5): every step from "plan" through "green" now
// starts with the SAME growing sequence — readAgentsChat right after
// thinkingItem2 (the agent re-reads AGENTS.md at the top of this session
// too, same as the warm-up), the six plan-grounding tool rows, then the
// plan itself. Each `throughX` const is that session's history as of step
// X, spread as the PREFIX of the next; only each step's own new tail is
// written out explicitly below — keeps this from being 15 separately
// hand-edited arrays. ----
const throughPlan: ChatItem[] = [
  promptChange,
  thinkingItem2,
  readAgentsChatPlan,
  searchInsertTransactionChatPlan,
  readDot400ChatPlan,
  readDot200ChatPlan,
  searchDependenciesChatPlan,
  searchReverseDependenciesChatPlan,
  assistantPlanChatPaced,
  planApprovalPending,
];
const throughPlanApproved: ChatItem[] = [
  ...throughPlan.slice(0, -1),
  { ...planApprovalPending, approval: "resolved" },
  assistantImplementingChat,
  writeLimitTestChat,
];
const throughRedRun: ChatItem[] = [
  ...throughPlanApproved,
  bashFirstRunChat,
  assistantFirstRunBugChat,
  readClientJsChat,
  fixTestsChat,
  bashRedRunChat,
  assistantRedSummaryChat,
];
// Owner review round 4: the pair `readAgentsChat, assistantAgentsRuleChat`
// that used to sit here (re-reading AGENTS.md a second time, in the
// now-deleted "read-agents" step) is replaced by assistantRetrieveChat alone
// — AGENTS.md was already read once, at the top of this session
// (throughPlan's own readAgentsChatPlan).
const throughRetrieve: ChatItem[] = [...throughRedRun, assistantRetrieveChat, getElementsChat, getElementContentChat];
const throughChange: ChatItem[] = [...throughRetrieve, assistantChangeChat];
const throughDiagnosticsChat: ChatItem[] = [...throughChange, assistantDiagnosticsChat];
const throughHostWriteAsk: ChatItem[] = [...throughDiagnosticsChat, assistantHostWriteChat];
const throughHostWritePending: ChatItem[] = [...throughHostWriteAsk, updateElementChat];
const throughGenerate1: ChatItem[] = [
  ...throughHostWriteAsk,
  { ...updateElementChat, approval: "resolved" },
  assistantBeforeGenerate1Chat,
  generate1Chat,
  rc12Result1Chat,
  rc12Assistant1Chat,
];
const throughGenerate2: ChatItem[] = [
  ...throughGenerate1,
  updateElementV2Chat,
  generate2Chat,
  rc12Result2Chat,
  rc12Assistant2Chat,
];
const throughGenerate3: ChatItem[] = [
  ...throughGenerate2,
  updateElementV3Chat,
  assistantBeforeGenerate3Chat,
  generate3Chat,
  rc0ResultChat,
];
const throughDeploy: ChatItem[] = [...throughGenerate3, assistantBeforeDeployChat, deployChat];
const throughGreen: ChatItem[] = [
  ...throughDeploy,
  assistantAfterDeployChat,
  runRegressionAfterChat,
  runNewTestGreenChat,
  assistantGreenSummaryChat,
];

export const STEPS: Step[] = [
  {
    id: "title",
    scene: "title",
    title: "Title",
    caption: `Claude Code + Endevor MCP + HB.js MCP + Zowe MCP in the CICS region — ${TECHUTEX_RATIO}× faster.`,
    // The round-9 headline spans the whole width; a side callout covered its
    // right third, so the three narration paragraphs sit in the top band.
    narrationSide: "top",
    // verbatim (owner, review round 3) — his own paragraph breaks kept, now
    // rendered as Markdown by NarrationCallout (kit-wide change).
    narration:
      "We will demonstrate how Broadcom tools enable AI agents to modify and test real CICS application. The " +
      "application code is in Endevor.\n\nThe AI agent will use Broadcom MCP servers with tools for Endevor, " +
      "HB.js, and Zowe.\n\nYou will see a change that typically takes hours during this short, few minutes long " +
      "demo.",
    titleScene: {
      // verbatim (owner, review round 9 — text edits). The ratio left the
      // headline with this edit; it still heads the compare slide.
      headline: "How Broadcom MCP Tools make AI Agents Effective for COBOL and CICS Application Development",
      subline:
        "Claude Code with Endevor, HostBridge JavaScript Engine (HB.js), and Zowe adding a new feature to a CICS " +
        "Application in COBOL",
      logoUrl: DEMO_ATM_BRAND.logoUrl,
    },
  },
  {
    id: "before-accepted",
    scene: "atm",
    // Four narration paragraphs: no side slot on this scene is tall enough
    // (the 3270 panel fills the right column), so the reserved top band.
    narrationSide: "top",
    title: "No daily limit — yet",
    caption:
      "Today's DOT500: no daily limit. HostBridge JavaScript Engine (HB.js) drives a real CICS transaction (DOT5) in the CICS region over its " +
      "virtual-terminal API; the 3270 panel is a real Panelwright capture of the same screen, with the amount and " +
      "account substituted to the demo's own values.",
    hotspot: { target: "atm-confirm", label: `Send $${DEMO_DEBIT_AMOUNT}` },
    // verbatim (owner, review round 3) — owner's paragraph breaks kept; his
    // own text already reads "company" (the "compapy" typo the coordinator
    // flagged was already fixed in what was handed to us — nothing left to
    // correct here, noted in the report).
    narration:
      "We have a CICS application that is used by ATM of this fictional Techutex Banking company.\n\nIn this " +
      "case HB.js provides the API on top of the CICS application.\n\nThis bank is missing a critical feature - " +
      "daily transaction limit so I can withdraw huge amount of money by mistake.\n\nLet's press the green " +
      "button to try it.",
    // verbatim (owner, review round 4; typos fixed [to do real work]) —
    // supersedes the review-round-3 text above.
    narrationAfter:
      `$${DEMO_DEBIT_AMOUNT} in one go, and the host says TRANSACTION INSERTED SUCCESSFULLY. There is no daily ` +
      "limit.\n\nThat is the gap we resolved today in this demo, in a short time thanks to Broadcom tools that " +
      "enable AI agents to do real work and verification on z/OS.",
    atm: {
      amount: DEMO_DEBIT_AMOUNT,
      result: "accepted",
      message: "TRANSACTION INSERTED SUCCESSFULLY",
      holdForPacket: true,
      showThreeTwoSeventy: true,
      screenSvgIdle: "dot5/02-filled",
      screenSvg: "dot5/04-accepted",
      // Owner's review round 4: "The CICS screen shows old amount." —
      // screens/02/03/04 are real $50.00-debit captures (screens/02-dot5-
      // filled.svg etc.), so the substitution to the demo's own amount/
      // account lives in prerender.mts's DOT5_SCREEN_SUBSTITUTIONS (applied
      // to the SVG string at build time, never on disk) — see its own
      // header comment for the exact fields and real values.
      screenNote: "Real CICS transaction behind the ATM request.",
    },
    diagram: { highlight: ["atm", "hbjs", "cics", "dot500", "dot200", "dotfile"] },
  },
  {
    id: "process",
    scene: "process",
    title: "The same ticket, two ways",
    caption: "The same loop; the human moves from typing every step to approving them.",
    hotspot: { target: "process-right-first", label: "Next" },
    // verbatim (owner, review round 4; typos fixed [in two ways; on the
    // right side; "without help only with the help" -> "with the help ...
    // only"; shifts; approve what; more detail; servers; allows]) —
    // supersedes the review-round-3 text above.
    narration:
      "We can do it in two ways - without help of AI on the left side and with on the right side. Without AI, " +
      "the developer has to do everything with the help of traditional tools only - Endevor Quick-Edit, a " +
      "generate action, look for errors in the listing, submit JCLs to deploy it, testing by hand at test " +
      "systems. We can all see that it will take hours at least.\n\nWith AI coding agents the role of the " +
      "developer shifts to more important work - specify a good prompt for AI, review the plan, approve what " +
      "the AI agent is allowed to do, review the automated tests and code changes. The AI helps with more " +
      "low-level parts of the work.\n\nWe see it in more detail during the real demo. Notice the MCP tools that " +
      "enable the AI agent to do it - Endevor MCP, HB.js MCP, Zowe MCP. Based on your application and tech " +
      "stack, you might need more or different MCP servers. The idea of MCP is that it allows you to meet your " +
      "needs.",
    narrationSide: "top",
    process: {
      left: {
        title: "Without an Agent", // owner, review round 10
        summary: leftSummary,
        summarySub: leftSummarySub,
        revealMsPerNode: PROCESS_REVEAL_MS * MANUAL_REVEAL_SLOWDOWN,
        lanes: [
          {
            icon: "person",
            label: "Developer",
            nodes: [
              { id: "ticket", label: "Ticket", timeHint: "—" },
              // Owner's review round 3: "Search for sources" — finding the
              // right elements (and their dependencies) in Endevor, not
              // just opening one already-known member; retrieveOpenMin now
              // comes from manualTimings.ts's owner-estimated 15 min stage.
              { id: "retrieve", label: "Search for sources", timeHint: formatHumanRounded(retrieveOpenMin) },
              { id: "read-cobol", label: "Read DOT500 + DOT400", timeHint: formatHumanRounded(readCodeMin) },
              { id: "design", label: "Design", timeHint: formatHumanRounded(designMin) },
              { id: "edit", label: "Edit", timeHint: formatHumanRounded(editMin) },
              // Kept as two separate nodes (not folded): the RC-check loop
              // only re-runs generate, never deploy — merging them would
              // misrepresent a failed generate round as re-deploying too.
              { id: "generate", label: "Generate & Deploy", timeHint: formatHumanRounded(round1Min) },
              { id: "rc-check", label: "RC 12?", decision: true },
              { id: "deploy", label: "Deploy to CICS", timeHint: formatHumanRounded(deployMin) },
              { id: "test-hand", label: "Test by hand at CICS test system", timeHint: formatHumanRounded(handTestMin) },
              { id: "wrong-check", label: "Wrong result?", decision: true },
              { id: "done", label: "Done" },
            ],
            loopbacks: [
              { from: "rc-check", to: "edit", label: `generate error: ${rcLoopLabel}` },
              { from: "wrong-check", to: "edit", label: "wrong result: another pass" },
            ],
          },
        ],
      },
      right: {
        title: "With AI Coding Agent and Broadcom MCP Tools", // owner, review round 10
        summary: "With the agent: minutes — you will watch it happen",
        summarySub: rightSummarySub,
        summaryAccent: true,
        revealMsPerNode: PROCESS_REVEAL_MS,
        lanes: [
          {
            icon: "person",
            label: "Developer",
            nodes: [
              { id: "prompt", label: "Prompt (the ticket)" },
              { id: "approve-plan", label: "Approve the plan" },
              { id: "approve-update", label: "Approve the Endevor element update" },
              { id: "read-diff", label: "Read the diff" },
              { id: "done", label: "Done" },
            ],
          },
          {
            icon: "spark",
            label: "Agent",
            nodes: [
              { id: "plan", label: "Analyze + plan (Endevor MCP)" },
              { id: "run-regr", label: "Run the regression check" },
              { id: "write-limit", label: "Write the new HB.js test" },
              { id: "run-red", label: "Run (red)" },
              { id: "read-source", label: "Retrieve code (Endevor MCP)" },
              { id: "edit", label: "Edit" },
              { id: "update-generate", label: "Update + generate (Endevor MCP)" },
              { id: "rc12-check", label: "RC 12?", decision: true },
              { id: "deploy", label: "Deploy" },
              { id: "tests-green-check", label: "Tests green?", decision: true },
            ],
            loopbacks: [
              { from: "rc12-check", to: "edit", label: "RC ≠ 0" },
              { from: "tests-green-check", to: "edit", label: "tests red" },
            ],
          },
          {
            // Owner's review round 3: the "Host (z/OS)" lane, which named
            // the LPAR/compiler underneath, is replaced with the tools the
            // agent actually calls, in the order it calls them — matching
            // the real chat order (search+retrieve, deploy+test the
            // warm-up, update+generate, deploy JCL, test again).
            icon: "tools",
            label: "MCP tools",
            // Owner: "The arrows between MCP tools themselves should not be
            // there — the MCP tools do not call each other but the agent
            // does call them." chain:false drops this lane's own connector
            // arrows (keeping the vertical spacing); the right diagram's own
            // `links` below draw the real relationship — which agent step
            // calls which tool — as subtle cross-lane lines instead.
            chain: false,
            nodes: [
              { id: "endevor-search", label: "Endevor MCP: search + retrieve" },
              { id: "hbjs-warmup", label: "HB.js MCP: deploy + run tests" },
              { id: "endevor-update", label: "Endevor MCP: update + generate" },
              { id: "zowe-deploy", label: "Zowe MCP: submit DEPLOY JCL" },
              { id: "hbjs-tests", label: "HB.js MCP: run tests" },
            ],
          },
        ],
        // Which agent step calls which MCP tool — read off the same chat
        // transcript this step's own demo drives (the regression check and
        // the red run both go through the warm-up HB.js deploy+test call;
        // the final tests-green decision is the LAST HB.js MCP tests call).
        links: [
          { from: "plan", to: "endevor-search" },
          { from: "run-regr", to: "hbjs-warmup" },
          { from: "run-red", to: "hbjs-warmup" },
          { from: "read-source", to: "endevor-search" },
          { from: "update-generate", to: "endevor-update" },
          { from: "deploy", to: "zowe-deploy" },
          { from: "tests-green-check", to: "hbjs-tests" },
        ],
        // Chronological rows across all three lanes — owner's review round
        // 7: the regression check stays the loop's first AGENT step, right
        // after the plan (the plan itself isn't a coding action); two
        // approvals (plan, then the Endevor update); the plan node so the
        // Endevor MCP tool box first appears alongside the plan-grounding
        // searches it does, not only once code retrieval starts; rows
        // align across lanes, replacing the old lane-by-lane reveal
        // (MCP tools, then agent steps, then human steps) with the real
        // call order.
        sequence: [
          "prompt",
          ["plan", "endevor-search"],
          "approve-plan",
          ["run-regr", "hbjs-warmup"],
          "write-limit",
          "run-red",
          "read-source",
          "edit",
          "approve-update",
          ["update-generate", "endevor-update"],
          "rc12-check",
          ["deploy", "zowe-deploy"],
          ["tests-green-check", "hbjs-tests"],
          "read-diff",
          "done",
        ],
      },
    },
  },
  {
    id: "warmup-question",
    scene: "vscode",
    title: "What do we have?",
    caption: "Before anything else: what's already tested?",
    // verbatim (owner, review round 5) — appends a second paragraph to the
    // review-round-4 text above, which stays verbatim as-is.
    narration:
      "Before touching an important application, we should understand how it is tested. Let's see how an AI agent " +
      "can answer this question.\n\nWe are in VS Code and have the AI agent within an AI coding assistant, Claude " +
      "Code in this case. It is very similar to what GitHub Copilot, Kiro, or other so-called AI coding harnesses " +
      "provide.",
    narrationSide: "top",
    vscode: {
      panel: "none",
      chatInput: "typing",
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [promptWarmup],
    },
  },
  {
    id: "warmup-agents",
    scene: "vscode",
    title: "Orientation first",
    caption: "AGENTS.md — the code map, the Endevor location, where the tests live and how to run them.",
    // verbatim (owner, review round 4) — supersedes the earlier draft text.
    narration:
      "Typical large projects that are developed with AI coding assistants leverage context about the project " +
      "stored in AGENTS.md files. This helps the AI agent to skip researching the codebase over and over for " +
      "each task.\n\nIn case of Endevor, you can store it as an Endevor element and use the Endevor MCP tool " +
      "get_element_content to load it.\n\nIn case of this prompt, it provides information about the testing " +
      "conventions that this project has.",
    // Multi-paragraph narration (owner, review round 4): the top band, not a
    // tall left callout over the editor text this step is about.
    narrationSide: "top",
    vscode: {
      openFile: "AGENTS.md",
      openFileAtChatIndex: 3,
      panel: "none",
      explorerSelected: "DOT/AGENTS",
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [promptWarmup, thinkingItem, assistantWarmupWhyAgentsChat, readAgentsChat],
    },
  },
  {
    id: "warmup-answer",
    scene: "vscode",
    title: "The existing check",
    caption:
      "One regression check already pins the current behaviour. Assumption: dot.regression.test.js was actually " +
      "WRITTEN in this same run (16:40:11) — staged here as pre-existing, DOGECICS's own device.",
    // verbatim (owner, review round 4) — supersedes the earlier draft text.
    narration:
      "Now the agent knows that HB.js is used to run the actions in the CICS environment and invokes " +
      "hbScriptList to list them and reads one of the tests - the one with the regression suite for the DOT " +
      "component.",
    narrationSide: "left",
    vscode: {
      openFile: "dot.regression.test.js",
      openFileAtChatIndex: 5,
      panel: "none",
      explorerSelected: "DOT/DOTREGRT",
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [
        promptWarmup,
        thinkingItem,
        assistantWarmupWhyAgentsChat,
        readAgentsChat,
        hbScriptListChat,
        readRegressionTestChat,
        assistantWarmupAnswer,
      ],
    },
  },
  {
    id: "warmup-run-prompt",
    scene: "vscode",
    title: "Run it",
    caption: "The presenter asks; the agent runs the check against the live region.",
    // verbatim (owner, review round 4).
    narration: "We can ask the AI agent to run them without the need to remember the syntax.",
    narrationSide: "left",
    vscode: {
      openFile: "dot.regression.test.js",
      panel: "none",
      explorerSelected: "DOT/DOTREGRT",
      chatInput: "typing",
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [
        promptWarmup,
        thinkingItem,
        assistantWarmupWhyAgentsChat,
        readAgentsChat,
        hbScriptListChat,
        readRegressionTestChat,
        assistantWarmupAnswer,
        promptRunTests,
      ],
    },
  },
  {
    id: "warmup-run",
    scene: "vscode",
    title: "Confirming green",
    caption: "Run against the live host — the baseline holds.",
    // verbatim (owner, review round 4) — supersedes the earlier draft text.
    narration:
      "After some time, we have seen that the tests are green, live against a real CICS environment. The " +
      "tests will help the AI agent to make changes in the application and verify that they have not caused " +
      "regressions.\n\nThis is a safe approach to leverage AI efficiently - invest into test automation so the " +
      "AI agent gets feedback quickly without waiting for human code review and manual testing.",
    // Multi-paragraph narration (owner, review round 4): the top band, not a
    // tall left callout over the editor text this step is about.
    narrationSide: "top",
    vscode: {
      openFile: "dot.regression.test.js",
      panel: "terminal",
      panelExpanded: true,
      explorerSelected: "DOT/DOTREGRT",
      terminalAnsi: "run-1-regression",
      terminalReplay: true,
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [
        promptWarmup,
        thinkingItem,
        assistantWarmupWhyAgentsChat,
        readAgentsChat,
        hbScriptListChat,
        readRegressionTestChat,
        assistantWarmupAnswer,
        promptRunTests,
        thinkingItem3,
        bashRunRegressionChat,
        assistantRegressionSummary,
      ],
    },
  },
  {
    id: "ticket",
    scene: "vscode",
    title: "The ticket",
    caption:
      `A $${DAILY_LIMIT.toLocaleString()}.00 daily debit limit, test-first, a plan before anything changes. ` +
      "Staged: the real run was a rehearsal in auto mode — this ticket was never actually typed as a message.",
    // verbatim (owner, review round 4) — supersedes the earlier draft text.
    narration:
      "Let's implement the change to have the daily limit. The first ticket is kept simple just to have a " +
      "preconfigured default value. That can be improved in other tickets that are not part of this demo.",
    narrationSide: "left",
    timerStart: true,
    vscode: {
      // No editor open (owner, review round 9: "close the editor with the code of tests") — the ticket is the whole screen.
      panel: "none",
      chatInput: "typing",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [promptChange],
      timerElapsedMs: msSinceLoopStart("tests-regression-run"), // 0 — this step IS the loop's own zero point
    },
  },
  {
    id: "plan",
    scene: "vscode",
    title: "The plan",
    caption:
      "One program, no map change: reuse DOT200's RETURN-HEADER, the same pattern DOT400 already uses. Staged " +
      "approval card — auto mode never actually paused for one.",
    // verbatim (owner, review round 5; typos fixed [tool tools -> tools;
    // planned changed -> planned change]).
    narration:
      "The AI agent is using various Endevor MCP tools to understand the application deeper, related to the " +
      "planned change.\n\nThe plan in summary: test first, retrieve and change DOT500, generate, deploy, run " +
      "everything again.",
    narrationSide: "left",
    hotspot: { target: "chat-approve", label: "Approve the plan" },
    vscode: {
      // No editor open (owner, review round 9: "close the editor with the code of tests") — the ticket is the whole screen.
      panel: "none",
      chatInput: "idle",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughPlan,
    },
  },
  {
    id: "write-new-test",
    scene: "vscode",
    title: "A test for the limit",
    caption: "dot.dailyLimit.test.js — a modest debit that must come back REJECTED.",
    narration:
      "Plan approved. First: a test for a rule that doesn't exist yet. Writing the element is proposed — the " +
      "real MCP server has no update tool today — but the test text is real, and it's what actually ran.",
    narrationSide: "left",
    vscode: {
      openFile: "dot.dailyLimit.test.js",
      panel: "none",
      explorerSelected: "DOT/DOTDLIMT",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughPlanApproved,
      timerElapsedMs: msSinceLoopStart("tests-new-written"),
    },
  },
  {
    id: "red-run",
    scene: "vscode",
    title: "Red, as expected",
    caption: 'FAIL — status ACCEPTED, "TRANSACTION INSERTED SUCCESSFULLY". The limit isn\'t there yet.',
    narration: "The new test fails for the right reason: the host still accepts the debit outright.",
    narrationSide: "left",
    vscode: {
      openFile: "dot.dailyLimit.test.js",
      panel: "terminal",
      panelExpanded: true,
      explorerSelected: "DOT/DOTDLIMT",
      terminalAnsi: "run-2-new-test-red",
      terminalReplay: true,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughRedRun,
      timerElapsedMs: msSinceLoopStart("tests-new-run"),
    },
  },
  {
    id: "read-dot500",
    scene: "vscode",
    title: "Retrieving DOT500",
    caption: "Real Endevor MCP calls — get_elements then get_element_content, DEV/1/BANKING/DOT.",
    // verbatim (owner, review round 4) — supersedes the earlier draft text.
    narration: "The agent reads the necessary code before making the change.",
    narrationSide: "left",
    vscode: {
      openFile: "DOT500.v0.cbl",
      scrollToLine: 845,
      highlightLines: [[845, 845]],
      panel: "none",
      explorerSelected: "DOT/DOT500",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughRetrieve,
      timerElapsedMs: msSinceLoopStart("read-sources"),
    },
  },
  {
    id: "diff-v0-v1",
    scene: "vscode",
    title: "First cut: DOT500",
    caption: "The limit check, the work fields, 4100-CHECK-DAILY-LIMIT reusing DOT200's RETURN-HEADER.",
    // First paragraph kept from the earlier draft; second paragraph verbatim
    // (owner, review round 4).
    narration:
      "The change, ahead of 4000-INSERT-TRANSACTION: check the limit, or reject and re-show the " +
      "screen.\n\nThis is integrated with the Explorer for Endevor VS Code extension by Broadcom to show a " +
      "diff to the developer.",
    // Multi-paragraph narration (owner, review round 4): the top band, not a
    // tall left callout over the editor text this step is about.
    narrationSide: "top",
    vscode: {
      openFile: "DOT500.v1.diff",
      editorMode: "diff",
      diffOf: ["DOT500.v0.cbl", "DOT500.v1.cbl"],
      panel: "none",
      explorerSelected: "DOT/DOT500",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughChange,
      timerElapsedMs: msSinceLoopStart("edit-v1"),
    },
  },
  {
    id: "diagnostics",
    scene: "vscode",
    title: "What an editor would have caught",
    caption:
      "Staged — this run had no editor open. Real compiler messages from generate-1-DOT500-build.txt, mapped " +
      "onto their real source lines.",
    // verbatim (owner, review round 4) — supersedes the earlier draft text.
    narration:
      "COBOL syntax rules are not easy to follow for LLMs. COBOL Language Support and compiler listings help " +
      "AI agents to fix the problems on their own.",
    narrationSide: "left",
    vscode: {
      openFile: "DOT500.v1.cbl",
      scrollToLine: 175,
      diagnostics: V1_DIAGNOSTICS,
      panel: "problems",
      explorerSelected: "DOT/DOT500",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughDiagnosticsChat,
    },
  },
  {
    id: "host-write-approval",
    scene: "vscode",
    title: "Writing to Endevor",
    caption:
      "update_element and generate_element are PROPOSED — the real MCP server has neither tool today. Staged " +
      "approval card, too — the real run was in auto mode and never paused here.",
    // verbatim (owner, review round 4) — supersedes the earlier draft text.
    narration:
      "The AI agent uses COBOL Language Support to resolve as much as possible locally before updating the " +
      "Endevor element on the mainframe.\n\nYou can see that this is the first update tool call so the agent " +
      "asks for approval.",
    // Multi-paragraph narration (owner, review round 4): the top band, not a
    // tall left callout over the editor text this step is about.
    narrationSide: "top",
    hotspot: { target: "chat-approve", label: "Approve the Endevor update" },
    vscode: {
      openFile: "DOT500.v1.cbl",
      panel: "none",
      explorerSelected: "DOT/DOT500",
      chatInput: "idle",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughHostWritePending,
    },
  },
  {
    id: "generate-rc12-1",
    scene: "vscode",
    title: "Generate — RC 12",
    caption: 'IGYDS0017-E: the new "01" level should begin in Area A.',
    // verbatim (owner, review round 4) — supersedes the earlier draft text.
    narration:
      "The real COBOL compiler might fail. Return code 12 — the first fixed-format slip this run actually " +
      "hit.\n\nThis is not a nice demo where everything works but a real scenario where you can see that the " +
      "real feedback from Broadcom tools helps agents to do the correct job.\n\nWe will turn on auto mode so " +
      "the agent can iterate on fixing the syntax errors and we can observe it.",
    // Multi-paragraph narration (owner, review round 4): the top band, not a
    // tall left callout over the editor text this step is about.
    narrationSide: "top",
    hotspot: { target: "chat-automode-toggle", label: "Turn on auto mode" },
    vscode: {
      openFile: "DOT500.v1.cbl",
      panel: "none",
      explorerSelected: "DOT/DOT500",
      autoMode: false,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughGenerate1,
      timerElapsedMs: msSinceLoopStart("generate-1"),
    },
  },
  {
    id: "generate-rc12-2",
    scene: "vscode",
    title: "Generate — RC 12 again",
    caption: "IGYDS0002-E / IGYDS0009-E: the COPY statement right after it still overlaps column 7.",
    narration: "Still RC 12 — a second, real fixed-format mistake right next to the first one.",
    narrationSide: "left",
    vscode: {
      openFile: "DOT500.v1.cbl",
      panel: "none",
      explorerSelected: "DOT/DOT500",
      autoMode: true,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughGenerate2,
      timerElapsedMs: msSinceLoopStart("generate-2"),
    },
  },
  {
    id: "diff-v0-v2",
    scene: "vscode",
    title: "Settled: DOT500",
    caption:
      "v0 → v2, the deployed fix — round 2's own intermediate edit was never saved as a separate file " +
      "(MANIFEST.md), so this diff is the FULL change, not just the last round's delta.",
    narration: "Return code 0. The fix that actually shipped, start to finish.",
    narrationSide: "left",
    vscode: {
      openFile: "DOT500.v2.diff",
      editorMode: "diff",
      diffOf: ["DOT500.v0.cbl", "DOT500.v2.cbl"],
      panel: "none",
      explorerSelected: "DOT/DOT500",
      autoMode: true,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughGenerate3,
      timerElapsedMs: msSinceLoopStart("generate-3"),
    },
  },
  {
    id: "deploy",
    scene: "vscode",
    title: "Deploy",
    caption:
      "A JCL job through Zowe MCP (proposed) — load module copied to USER.CICS.BIZAPP.DOT.LOAD, CEMT " +
      "PHASEIN, no restart. The phasein result is real.",
    // verbatim (owner, review round 5).
    narration: "One deploy step, real output: the updated DOT500 is live in the CICS region.",
    narrationSide: "left",
    vscode: {
      openFile: "DOT500.v2.cbl",
      panel: "none",
      explorerSelected: "DOT/DOT500",
      autoMode: true,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughDeploy,
      timerElapsedMs: msSinceLoopStart("deploy"),
    },
  },
  {
    id: "green",
    scene: "vscode",
    title: "Green",
    caption: "Both tests pass, live: regression unchanged, the new one REJECTED with DAILY DEBIT LIMIT EXCEEDED.",
    // verbatim (owner, review round 5).
    narration: "Regression still green, new test now green. The new daily limit feature is live and working well.",
    narrationSide: "left",
    timerStop: true,
    vscode: {
      autoMode: true,
      openFile: "dot.dailyLimit.test.js",
      panel: "terminal",
      panelExpanded: true,
      explorerSelected: "DOT/DOTDLIMT",
      terminalAnsi: "run-4-new-test-green",
      terminalReplay: true,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: throughGreen,
      timerElapsedMs: msSinceLoopStart("tests-run-green"),
    },
  },
  {
    id: "after-refused",
    scene: "atm",
    title: `$${DEMO_DEBIT_AMOUNT}, refused`,
    caption:
      "The same debit now stops at the door — ERROR: DAILY DEBIT LIMIT EXCEEDED. " +
      "(tests/run-4-new-test-green.txt; the 3270 panel is a real Panelwright capture, screens/03-dot5-rejected, " +
      "with the amount and account substituted to the demo's own values.)",
    // verbatim (owner, review round 6).
    narration: `This is the new behavior. Same account, same $${DEMO_DEBIT_AMOUNT} — declined. Because of the daily limit.`,
    atm: {
      amount: DEMO_DEBIT_AMOUNT,
      result: "refused",
      message: "ERROR: DAILY DEBIT LIMIT EXCEEDED",
      showThreeTwoSeventy: true,
      screenSvgIdle: "dot5/02-filled",
      // screens/03-dot5-rejected is on DOT500's currently-deployed
      // post-change load module (the same v2 fix this story ships) — real,
      // not staged.
      screenSvg: "dot5/03-rejected",
      // Owner's review round 4 — same treatment as before-accepted's
      // screenNote (see its own comment); the substitution lives in
      // prerender.mts's DOT5_SCREEN_SUBSTITUTIONS.
      screenNote: "Real CICS transaction behind the ATM request.",
    },
    diagram: { highlight: ["dot500"] },
  },
  {
    id: "compare",
    scene: "compare",
    title: "Agent loop vs. manual",
    caption:
      "The same change, timed: the measured agent loop against a manual Endevor path built from ESTIMATES " +
      "(no stopwatch baseline exists for this ticket) plus two real character counts.",
    // verbatim (owner, review round 9; typos fixed [in average . -> on average.; all it -> all of it]).
    narration:
      "The demo ran a little bit quicker but not significantly - it took about 10 minutes on average. By hand it " +
      "would be hours. Endevor MCP + Zowe MCP + HB.js MCP give the agent the same path a developer has.\n\nWith AI " +
      "agents, developers can spend time thinking about what the application does, if the plan makes sense, and " +
      "how it is tested rather than spending a lot of time inside COBOL code, fixing syntax errors, or writing " +
      "test automation - AI agents help with all of it.",
    // Multi-paragraph narration (owner, review round 5), same treatment as
    // every other multi-paragraph narration in this file: the top band, not
    // a side callout over the scene's own bars.
    narrationSide: "top",
  },
];
