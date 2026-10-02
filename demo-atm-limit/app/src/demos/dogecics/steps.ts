/**
 * The whole story, as data. Every scene reads its own slice of a Step and
 * ignores the rest. Chat/tool-card bodies quote the real captured run
 * (captures/run1) rather than inventing dialogue — see CAPTURES in
 * ../generated/captures. Elapsed-time figures (tool durations, the
 * TimerHud's per-step jump) are computed from CAPTURES.timings/hostLog —
 * never invented — and simply omitted where the capture has nothing to
 * measure (e.g. a Read has no logged stage). Narration text (Step.narration)
 * and every `assistant` chat line marked "narrative" below are the
 * deliberate exception — dramatized presenter/session text, not a captured
 * fact; the design record lists every one of them.
 */
import { CAPTURES } from "../../generated/dogecics/captures";
import {
  MANUAL_HAND_TESTED,
  MANUAL_WITH_TESTS,
  sumKinds,
  kindTotal,
  formatHalfHour,
  formatMinSec,
  formatHumanRounded,
} from "./manualTimings";
import { agentLoopTotalMs, msSinceLoopStart } from "./agentLoopTiming";
import { DAILY_LIMIT } from "./config";
import { REPLAY_MS_PER_LINE } from "../../kit/engine/pacing";
import type { ChatItem, Step } from "../../kit/engine/types";

/** Same, but for the search-grep capture (a second, unrelated grep runs later in that same file). */
function searchLines(from: number, to: number): string {
  return CAPTURES.searchGrep
    .split("\n")
    .slice(from - 1, to)
    .join("\n");
}

/** Splits a captured CLI transcript slice into the command(s) actually typed ("$ ...") and everything else (the host's own output) — a deterministic IN/OUT split, not a hand-picked one. */
function splitHostBlock(...ranges: Array<[number, number]>): { input: string; output: string } {
  const raw = ranges.flatMap(([from, to]) => CAPTURES.hostLog.split("\n").slice(from - 1, to));
  const input = raw
    .filter((l) => l.startsWith("$ "))
    .map((l) => l.slice(2))
    .join("\n");
  const output = raw.filter((l) => !l.startsWith("$ ")).join("\n");
  return { input, output };
}

/** epoch-ms elapsed since the capture's own "start" stage — used ONLY for durations between two named stages (a delta, unaffected by which stage the TimerHud treats as its own zero). */
function elapsedAt(stage: string): number {
  const start = CAPTURES.timings[0]!.epochMs;
  const row = CAPTURES.timings.find((r) => r.stage === stage);
  return row ? row.epochMs - start : 0;
}

/** How long TerminalPane's own line-by-line replay of a captured transcript takes (Terminal.tsx) — used to hold a chat summary back (ChatItem.revealAfterMs) until the terminal panel showing the SAME run has actually finished scrolling by, instead of the summary jumping ahead of it. */
function replayDurationMs(ansiKey: keyof typeof CAPTURES.ansi): number {
  return CAPTURES.ansi[ansiKey].split("\n").length * REPLAY_MS_PER_LINE;
}

const WARMUP_PROMPT = "What tests do we have for the ATM?";
const RUN_TESTS_PROMPT = "Run the tests";
// A narrative paraphrase of captures/run1/prompt.md — shorter, and framed as
// the start of a NEW session rather than the ticket's original imperative
// list, per the owner's review (steps `ticket` now resets the session).
const NEW_PROMPT =
  "Let's implement a new feature: a daily withdrawal limit for the ATM. 10,000 DOGE per day is the hard-coded " +
  "default for now; making it configurable is the next ticket. Work test-first, and show me your plan before " +
  "changing anything.";

const WARMUP_SESSION_TITLE = "Tests for the ATM";
const TICKET_SESSION_TITLE = "Daily withdrawal limit";

const promptWarmup: ChatItem = { kind: "user", text: WARMUP_PROMPT, typed: true };
const promptRunTests: ChatItem = { kind: "user", text: RUN_TESTS_PROMPT, typed: true };
const promptChange: ChatItem = { kind: "user", text: NEW_PROMPT, typed: true };
// No stage in timings.jsonl measures "how long before the first tool call" —
// shown as "Thinking…" with no duration, never an invented number. Reused
// as its own item instance each time it's needed (kind:"thinking" carries
// no data, so there's nothing to get out of sync between the instances).
const thinkingItem: ChatItem = { kind: "thinking" };
const thinkingItem2: ChatItem = { kind: "thinking" };
const thinkingItem3: ChatItem = { kind: "thinking" };

// ---- (a) the warm-up exchange: dramatized, not captured — AGENTS.md says
// the regression suite already exists, so this is the agent confirming
// that rather than writing it live. No durations: nothing here was timed. ----
const searchTestsChat: ChatItem = {
  kind: "tool",
  tool: "Search",
  title: "tests in test/",
  input: 'grep -rl "describe(" test/',
  output: "test/atm.regression.test.ts\ntest/atm.limit.test.ts",
  approval: "resolved",
};
const readRegressionChat: ChatItem = {
  kind: "tool",
  tool: "Read",
  title: "atm.regression.test.ts",
  approval: "resolved",
};
const assistantWarmupAnswer: ChatItem = {
  kind: "assistant",
  text:
    "Four live tests in `test/atm.regression.test.ts` pin the current behaviour: balance, recent transactions, " +
    "the placeholder-address rejection, an ordinary send. They run against the real DOGECICS on tk5probe.",
};

const bashRunRegressionChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Run the regression tests",
  // The real command from the recapture (run from demo-atm-limit).
  input: "npx vitest run test/atm.regression.test.ts --reporter=verbose",
  output: CAPTURES.ansi["vitest-1-regression"],
  approval: "resolved",
  durationMs: elapsedAt("tests-regression-run") - elapsedAt("tests-regression-written"),
};
// narrative: not captured — held back with revealAfterMs until the terminal
// panel's OWN replay of this same run has actually finished scrolling.
const assistantRegressionSummary: ChatItem = {
  kind: "assistant",
  text:
    "4 passed against the live host: balance, recent transactions, the placeholder-address rejection, an " +
    "ordinary send. The existing withdrawal behaviour is covered — anything a change to DOGESEND breaks will " +
    "show up here.",
  revealAfterMs: replayDurationMs("vitest-1-regression"),
};

// ---- (d) the plan — a condensed, narrative rendering of plan.md (the real
// file runs long enough to need scrolling in this panel — the owner's
// review asked for one that fits without it), organised under real
// headings so markdownLite.tsx's #/##/### support renders them as such. ----
const PLAN_TEXT = `## Plan: daily withdrawal limit
**Where:** \`cobol/DOGESEND.cbl\`, paragraph \`MOVE-SOME-DOGE\` — the only place a send is accepted.
### 1. Tests first
Four cases in \`test/atm.limit.test.ts\`: over the limit refused, under it accepted, decimals, cumulative across sends. Run them — red, because the limit does not exist yet.
### 2. The change — one program, no map change
- A daily tracker record in \`DOGEVSAM\` under key \`0000000000\`; it sorts before every real record, so balance and history never see it.
- Today's date from \`ASKTIME\` + \`FORMATTIME\`; a tracker stamped with another day resets the total.
- Parse the typed amount to numeric, \`READ UPDATE\` the tracker; if total + amount > 10,000 refuse with \`DAILY LIMIT 10000 DOGE EXCEEDED\`, else \`REWRITE\` and send as before.
### 3. Compile and verify
\`transfer put\` the member, submit \`jcl/COMPSEND.jcl\`, read the listing, rerun all eight tests.`;

const assistantPlanChat: ChatItem = { kind: "assistant", text: PLAN_TEXT };
const planApprovalPending: ChatItem = { kind: "plan-approval", approval: "pending" };

// narrative: not captured.
const assistantImplementingChat: ChatItem = {
  kind: "assistant",
  text:
    "Implementing the plan. Step 1: tests for the new behaviour, before any COBOL changes — so we can watch " +
    "them fail first.",
};
const writeLimitTestsChat: ChatItem = {
  kind: "tool",
  tool: "Write",
  title: "test/atm.limit.test.ts",
  approval: "resolved",
  durationMs: elapsedAt("tests-limit-written") - elapsedAt("tests-regression-run"),
};

// narrative: not captured.
const assistantRunningWholeSuiteChat: ChatItem = {
  kind: "assistant",
  text:
    "Running the whole suite. The four new tests must fail — the limit isn't there yet. A failure here proves " +
    "they test the new behaviour, not something that already works.",
};
const bashRunAllTestsRedChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Run all tests",
  input: "npx vitest run --reporter=verbose",
  output: CAPTURES.ansi["vitest-2-limit-red"],
  approval: "resolved",
  durationMs: elapsedAt("tests-limit-run") - elapsedAt("tests-limit-written"),
};
// narrative: not captured. The two failing test names are quoted VERBATIM
// from captures/run1/vitest-2-limit-red.ansi — and so is the real pass/fail
// split: the capture is 6 green + 2 red (4 pre-existing regression tests
// plus 2 of the 4 new limit tests already passing), not the 4-green/2-red
// the brief assumed; corrected here rather than shipping an invented count.
const assistantRedSummaryChat: ChatItem = {
  kind: "assistant",
  text:
    "6 green, 2 red — `refuses a single withdrawal over the limit` and `counts withdrawals cumulatively within " +
    "the day` still get SENDING from the host. Red for the right reason. Now the COBOL.",
  revealAfterMs: replayDurationMs("vitest-2-limit-red"),
};

// narrative: not captured.
const assistantBeforeTouchingChat: ChatItem = {
  kind: "assistant",
  text:
    "Before touching the COBOL: AGENTS.md — what each program does, how to reach the host, which compiler " +
    "this is.",
};
const readAgentsMdChat: ChatItem = { kind: "tool", tool: "Read", title: "AGENTS.md", approval: "resolved" };

// narrative: not captured.
const assistantAgentsRuleChat: ChatItem = {
  kind: "assistant",
  text:
    "AGENTS.md: every rule about a send lives in DOGESEND. Reading it, then locating the paragraph that " +
    "accepts a send.",
};
const readDogesendChat: ChatItem = { kind: "tool", tool: "Read", title: "DOGESEND.cbl", approval: "resolved" };
const searchChat: ChatItem = {
  kind: "tool",
  tool: "Search",
  title: "MOVE-SOME-DOGE in cobol/",
  input: searchLines(1, 1).replace(/^\$ /, ""),
  output: searchLines(2, 13),
  approval: "resolved",
  // tests-limit-run -> search: the real gap the capture measured, even
  // though this demo now shows the search well after that stage (behind two
  // Read rows) rather than right next to it.
  durationMs: 31551,
};

// narrative: not captured.
const assistantChangeChat: ChatItem = {
  kind: "assistant",
  text:
    "The change, inside DOGESEND only: a tracker record under key 0000000000, CHECK-DAILY-LIMIT before the " +
    "send, RECORD-DAILY-TOTAL after it.",
};
const editV1Chat: ChatItem = {
  kind: "tool",
  tool: "Edit",
  title: "cobol/DOGESEND.cbl",
  output: "tracker record, CHECK-DAILY-LIMIT, RECORD-DAILY-TOTAL — see the diff",
  approval: "resolved",
  durationMs: elapsedAt("edit-v1") - elapsedAt("plan"),
};

const writeJclChat: ChatItem = {
  kind: "tool",
  tool: "Write",
  title: "jcl/COMPSEND.jcl",
  approval: "resolved",
  durationMs: elapsedAt("jcl-written") - elapsedAt("edit-v1"),
};
// narrative: not captured.
const assistantNowMainframeChat: ChatItem = {
  kind: "assistant",
  text:
    "Now the mainframe: upload DOGESEND to HERC02.DOGECICS and submit the compile job. This writes to the " +
    "host, so I'm asking first.",
};
const uploadSubmitV1Chat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Upload DOGESEND and submit the compile",
  ...splitHostBlock([24, 30]),
  approval: "pending",
  durationMs: elapsedAt("submit") - elapsedAt("jcl-written"),
};

const fetchListingV1Chat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Fetch the job listing",
  ...splitHostBlock([31, 43]),
  approval: "resolved",
  // includes the real idle-timeout + retry the capture hit — a slow host
  // round trip, not a slow tool.
  durationMs: 82465,
};

const rc12ResultChat: ChatItem = {
  kind: "result",
  tone: "error",
  text: [CAPTURES.rc12.condCode, "", ...CAPTURES.rc12.errorBlock].join("\n"),
};

const rc12AssistantChat: ChatItem = {
  kind: "assistant",
  text:
    "RC 12 — this OS/VS COBOL predates UNSTRING and INSPECT; the compiler read them as " +
    "paragraph names. Rewriting the amount parsing with a subscripted table and EXAMINE. " +
    "Fixing it and resubmitting — the second upload would ask again, so I'm switching on auto mode to let the " +
    "loop run.",
};

const editV2Chat: ChatItem = {
  kind: "tool",
  tool: "Edit",
  title: "cobol/DOGESEND.cbl",
  output: "SCAN-AMOUNT / COPY-INT-DIGIT / COPY-DEC-DIGIT — a by-hand digit scan, see the diff",
  approval: "resolved",
  durationMs: elapsedAt("edit-v2") - elapsedAt("job-output"), // second job-output row (job-rc12-rerun capture)
};

const resubmitV2Chat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Resubmit the compile",
  input: splitHostBlock([44, 50], [57, 60]).input,
  output:
    splitHostBlock([44, 50], [57, 60]).output +
    "\n\nJOB00038 — MAX COND CODE 0004:\n" +
    CAPTURES.jobs.JOB00038.diagnostics.join("\n"),
  approval: "resolved",
  durationMs: elapsedAt("job-output") - elapsedAt("edit-v2"), // second job-output row again
};

const runAllTestsChat: ChatItem = {
  kind: "tool",
  tool: "Bash",
  title: "Run all tests",
  // The real command from the recapture (run from demo-atm-limit).
  input: "npx vitest run --reporter=verbose",
  output: CAPTURES.ansi["vitest-3-after-v2"],
  approval: "resolved",
  durationMs: elapsedAt("tests-run-3") - elapsedAt("job-output"),
};

// CAPTURES.timings has two rows literally named "job-output" (one per
// compile); Array.prototype.find above always resolves the FIRST one, so
// editV2Chat/resubmitV2Chat/runAllTestsChat's durations above are wrong by
// construction — recomputed correctly here from the raw rows instead.
const timingRows = CAPTURES.timings;
const startMs = timingRows[0]!.epochMs;
const jobOutput2Ms = timingRows.filter((r) => r.stage === "job-output")[1]!.epochMs - startMs;
editV2Chat.durationMs = elapsedAt("edit-v2") - jobOutput2Ms;
resubmitV2Chat.durationMs = elapsedAt("job-output-2") - elapsedAt("edit-v2");
runAllTestsChat.durationMs = elapsedAt("tests-run-3") - elapsedAt("job-output-2");
// Same second-"job-output"-row correction, but relative to the TimerHud's
// own zero point (agentLoopTiming.ts's LOOP_START_STAGE) instead of the
// capture's absolute start — what "compile-v1-fails" jumps the HUD to.
const jobOutput2MsFromLoopStart = jobOutput2Ms - elapsedAt("tests-regression-run");

// narrative: not captured. Held back until the terminal panel's own replay
// of this same run has finished.
const assistantGreenSummaryChat: ChatItem = {
  kind: "assistant",
  text:
    "All 8 tests pass against the live host: the four regression tests unchanged, the four limit tests now " +
    "green. The daily limit of 10,000 DOGE is live in DOGESEND — making it configurable is the next ticket.",
  revealAfterMs: replayDurationMs("vitest-3-after-v2"),
};

// ---- process step: the "without an agent" diagram's per-node time
// estimates, sliced from MANUAL_HAND_TESTED's seven stages (index order:
// 0 logon+open, 1 read-ticket+code, 2 design, 3 write-the-change, 4
// submit+compile+RC12-listing, 5 rewrite-v2, 6 restart-KICKS+test-by-hand —
// manualTimings.ts). Every number below is a real slice of one of those
// stages (never invented), and stages 0-6 together are exactly
// MANUAL_HAND_TESTED, so the per-node numbers and the big total below both
// move together if a stage there changes. Rounded to a coarse human scale
// (formatHumanRounded) for the diagram; the big total stays exact.
const [mtLogon, mtRead, mtDesign, mtWriteChange, mtSubmitRc12, mtRewriteV2, mtKicksTest] = MANUAL_HAND_TESTED;

// "Read the COBOL" carries stage 0 (logon + open the member) too — there's
// no separate "Logon" node in this diagram, and opening the member is what
// you do to start reading it.
const readCobolMin = (mtLogon.mechanicsSec ?? 0) / 60 + (mtRead.mechanicsSec ?? 0) / 60 + mtRead.thinkingMin;
const designMin = kindTotal(sumKinds([mtDesign]));
const editRevEditMin = kindTotal(sumKinds([mtWriteChange]));
// The two measured sub-splits of stage 3's mechanics — its own basis text:
// "submit to ON OUTPUT QUEUE 8.3 s measured; the listing is 89 terminal
// screens (measured) at 2 s per ENTER-and-skim" (8.3 + 89*2 = 186.3 of the
// stage's 190s — the ~4s gap is the source measurement's own slack, not
// dropped by this split).
const submitSec = 8;
const pageListingSec = 178;
// The loop-back's cost is a RANGE: at best one more compile round with a
// one-line fix (the measured submit + listing mechanics alone — the edit
// itself is seconds); at worst what the measured run actually hit — stage
// 4's leftover thinking (understanding the RC 12) plus the whole of stage
// 5 (the v2 rewrite + its recompile+re-read).
const rcLoopMinLow = (submitSec + pageListingSec) / 60;
const rcLoopMin = mtSubmitRc12.thinkingMin + kindTotal(sumKinds([mtRewriteV2]));
const rcLoopLabel = `+ ${formatHumanRounded(rcLoopMinLow)} – ${formatHumanRounded(rcLoopMin)}`;
// Stage 5's own basis text: "KICKS lifecycle 25 s measured" — the process
// diagram now says CICS (item 3), the underlying measurement is unchanged.
const restartKicksSec = 25;
const testByHandSec = (mtKicksTest.mechanicsSec ?? 0) + mtKicksTest.thinkingMin * 60 - restartKicksSec;

const handTestedTotalMin = kindTotal(sumKinds(MANUAL_HAND_TESTED));
const withTestsTotalMin = kindTotal(sumKinds(MANUAL_WITH_TESTS));
// Rounded to the nearest half hour (formatHalfHour), not the exact minute
// (formatHM) — this is the slide's own headline, not the compare step's
// precise bars, which still quote the exact figures.
const leftSummary = `≈ ${formatHalfHour(handTestedTotalMin)} with manual tests · ${formatHalfHour(withTestsTotalMin)} including test authoring`;
const leftSummarySub = `happy path — every syntax slip adds a compile round (${rcLoopLabel})`;

// The agent diagram reveals a node every PROCESS_REVEAL_MS; the manual one
// MANUAL_REVEAL_SLOWDOWN times slower — the pace is part of the message
// (the owner's request), not a measurement of anything.
const PROCESS_REVEAL_MS = 260;
const MANUAL_REVEAL_SLOWDOWN = 5;

const agentLoopMin = agentLoopTotalMs() / 60000;
const rightSummarySub = `measured ${formatMinSec(agentLoopMin)} on the last slide`;

export const STEPS: Step[] = [
  {
    id: "title",
    scene: "title",
    title: "Title",
    caption: "Claude Code + Panelwright on DOGECICS — one ticket, done twice.",
    narration:
      "One ticket, done twice: by hand the way we always have, and with an AI agent that has the same tools a " +
      "developer has. Same mainframe, same CICS application, same tests.",
    titleScene: {
      headline: "Adding features to CICS applications with AI agents in minutes instead of hours",
      subline: "Claude Code + Panelwright, live against DOGECICS (KICKS on MVS 3.8)",
    },
  },
  {
    id: "before-accepted",
    scene: "atm",
    title: "No daily limit — yet",
    caption:
      "The Doge ATM today: withdraw 50,000 DOGE in one go, no questions asked. " +
      "Panelwright drives a real TN3270 session into KICKS (CICS) on MVS 3.8 — the ATM never touches VSAM directly.",
    hotspot: { target: "atm-confirm", label: "Send 50,000 DOGE" },
    narration:
      "This is a Doge Bank ATM. Behind it is a real CICS application — DOGECICS — on a mainframe, reached over a " +
      "3270 session. Balance: 200,050 DOGE.",
    narrationAfter:
      "50,000 DOGE in one go, and the host says SENDING. There is no daily limit. That is the gap we close today.",
    atm: {
      amount: "50000",
      result: "accepted",
      message: "SENDING 50000 DOGE",
      holdForPacket: true,
      showThreeTwoSeventy: true,
      screenSvgIdle: "atm-before-50000/02-main-menu",
      screenSvg: "atm-before-50000/04-send-result",
    },
    diagram: { highlight: ["atm", "core", "tn3270", "kicks", "dogesend", "vsam"] },
  },
  {
    id: "process",
    scene: "process",
    title: "The same ticket, two ways",
    caption: "The same loop; the human moves from typing every step to approving them.",
    hotspot: { target: "process-right-first", label: "Next" },
    narration:
      "Two ways to close it. Alone: ISPF, a compile job, a ~100-page listing, testing by hand in CICS — hours. " +
      "With an agent that has the same tools, and a developer approving: minutes. You will watch it.",
    // Neither lane column has a real vertical gap the generic lift could
    // use (tried "left", tried per-node data-keep-clear, tried "top-right"
    // — see ProcessScene.tsx's comment; all still clipped a node, an arc,
    // or the lane title at some window size). "top" instead: Stage.tsx
    // reserves real pixels for it above the whole stage, so it can't
    // overlap this or any other scene's content at any size.
    narrationSide: "top",
    process: {
      left: {
        title: "Without an agent",
        summary: leftSummary,
        summarySub: leftSummarySub,
        revealMsPerNode: PROCESS_REVEAL_MS * MANUAL_REVEAL_SLOWDOWN,
        lanes: [
          {
            icon: "person",
            label: "Developer",
            nodes: [
              { id: "ticket", label: "Ticket", timeHint: "—" },
              { id: "read-cobol", label: "Read the COBOL (ISPF)", timeHint: formatHumanRounded(readCobolMin) },
              { id: "design", label: "Design", timeHint: formatHumanRounded(designMin) },
              { id: "edit", label: "Edit in ISPF", timeHint: formatHumanRounded(editRevEditMin) },
              { id: "submit", label: "SUBMIT the compile", timeHint: formatHumanRounded(submitSec / 60) },
              {
                id: "page-listing",
                label: "Check the ~100-page listing",
                timeHint: formatHumanRounded(pageListingSec / 60),
              },
              { id: "rc-check", label: "RC ≠ 0?", decision: true },
              {
                id: "restart-kicks",
                label: "Restart CICS",
                timeHint: formatHumanRounded(restartKicksSec / 60),
              },
              {
                id: "test-hand",
                label: "Test live in CICS",
                timeHint: formatHumanRounded(testByHandSec / 60),
              },
              { id: "wrong-check", label: "Wrong result?", decision: true },
              { id: "done", label: "Done" },
            ],
            loopbacks: [
              { from: "rc-check", to: "edit", label: `compile error: ${rcLoopLabel}` },
              { from: "wrong-check", to: "edit", label: "wrong result: another pass" },
            ],
          },
        ],
      },
      right: {
        title: "With Claude Code + Panelwright",
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
              { id: "approve", label: "Approve tools (until auto mode)" },
              { id: "read-plan", label: "Read the plan" },
              { id: "read-diff", label: "Read the diff" },
              { id: "done", label: "Done" },
            ],
          },
          {
            icon: "spark",
            label: "Agent",
            nodes: [
              // The suite pre-exists (AGENTS.md) — no "Write regression
              // tests" node; the loop starts by confirming what's there.
              { id: "run-regr", label: "Run the existing tests" },
              { id: "write-limit", label: "Write limit tests" },
              { id: "run-red", label: "Run (red)" },
              { id: "read-plan-code", label: "Read the code + plan" },
              { id: "edit", label: "Edit" },
              { id: "upload-submit", label: "Upload + SUBMIT" },
              { id: "read-listing", label: "Read the listing" },
              { id: "rc12-check", label: "RC 12?", decision: true },
              { id: "tests-green-check", label: "Tests green?", decision: true },
            ],
            loopbacks: [
              { from: "rc12-check", to: "edit", label: "RC ≠ 0" },
              { from: "tests-green-check", to: "edit", label: "tests red" },
            ],
          },
          {
            icon: "host",
            label: "Host (MVS)",
            nodes: [
              { id: "tso-session", label: "TSO/CICS session, driven by Panelwright" },
              { id: "compile-job", label: "Compile job" },
              { id: "dogecics-answers", label: "Running the tests against DOGECICS" },
            ],
          },
        ],
      },
    },
  },
  {
    id: "warmup-question",
    scene: "vscode",
    title: "What do we have?",
    caption: "Before anything else: what's already tested?",
    narration:
      "First: what do we already have? The agent finds the regression suite — four tests written in plain " +
      "English — and runs it against the live application.",
    narrationSide: "left",
    vscode: {
      // No file open yet — the empty-chat warm-up state.
      panel: "none",
      chatInput: "typing",
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [promptWarmup],
    },
  },
  {
    id: "warmup-answer",
    scene: "vscode",
    title: "The existing suite",
    caption: "Four regression tests already pin the current behaviour.",
    narration:
      "The suite: balance, recent transactions, a rejected address, an ordinary send — four descriptions in " +
      "plain English. The agent reads them the way we would.",
    narrationSide: "left",
    vscode: {
      openFile: "atm.regression.test.ts",
      // Empty ("No editor open") until the Read row itself has appeared —
      // the file wasn't open from the moment the step was entered.
      openFileAtChatIndex: 3,
      panel: "none",
      explorerSelected: "test/atm.regression.test.ts",
      highlightLines: [
        [19, 19],
        [23, 23],
        [34, 34],
        [40, 40],
      ],
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [promptWarmup, thinkingItem, searchTestsChat, readRegressionChat, assistantWarmupAnswer],
    },
  },
  {
    id: "warmup-run-prompt",
    scene: "vscode",
    title: "Run them",
    caption: "The presenter asks; the agent runs the suite against the live host.",
    narrationSide: "left",
    vscode: {
      openFile: "atm.regression.test.ts",
      panel: "none",
      explorerSelected: "test/atm.regression.test.ts",
      chatInput: "typing",
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [promptWarmup, thinkingItem, searchTestsChat, readRegressionChat, assistantWarmupAnswer, promptRunTests],
    },
  },
  {
    id: "warmup-run",
    scene: "vscode",
    title: "Confirming green",
    caption: "Run against the live host — the baseline holds.",
    narration: "Green. The application is tested; the agent can now change it safely.",
    narrationSide: "left",
    vscode: {
      openFile: "atm.regression.test.ts",
      panel: "terminal",
      panelExpanded: true,
      explorerSelected: "test/atm.regression.test.ts",
      terminalAnsi: "vitest-1-regression",
      terminalReplay: true,
      sessionTitle: WARMUP_SESSION_TITLE,
      chat: [
        promptWarmup,
        thinkingItem,
        searchTestsChat,
        readRegressionChat,
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
    caption: `${DAILY_LIMIT.toLocaleString()} DOGE daily limit, test-first, a plan before anything changes.`,
    narration:
      `The ticket: a ${DAILY_LIMIT.toLocaleString()} DOGE daily limit, test-first, and a plan before anything is ` +
      "touched. 10,000 is the hard-coded default — a configurable limit is the next ticket.",
    narrationSide: "left",
    timerStart: true,
    vscode: {
      // A genuinely NEW session (real Claude Code sessions are one ticket
      // each) — chat resets to just this one prompt; VSCodeScene's
      // chatRevealFrom treats a shorter chat array as nothing-yet-settled.
      openFile: "atm.regression.test.ts",
      panel: "none",
      explorerSelected: "test/atm.regression.test.ts",
      chatInput: "typing",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [promptChange],
      // The agent loop's own zero point (agentLoopTiming.ts's
      // LOOP_START_STAGE) — the regression suite pre-existed, so the clock
      // starts once that's confirmed, not at the capture's absolute start.
      timerElapsedMs: msSinceLoopStart("tests-regression-run"),
    },
  },
  {
    id: "plan",
    scene: "vscode",
    title: "The plan",
    caption: "One program, no map change: a tracker record in DOGEVSAM under a key nothing else reads.",
    narration:
      "The plan: tests first, then one program, compile on the host, run everything. I approve it and " +
      "pre-approve local edits — writes to the mainframe will still ask.",
    narrationSide: "left",
    hotspot: { target: "chat-approve", label: "Approve the plan" },
    vscode: {
      openFile: "atm.regression.test.ts",
      panel: "none",
      explorerSelected: "test/atm.regression.test.ts",
      // Paused on the plan-approval card, not generating.
      chatInput: "idle",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [promptChange, thinkingItem2, assistantPlanChat, planApprovalPending],
      // Real timestamp omitted here on purpose: "plan" and "search" land
      // within 50ms of each other in the real capture, but this demo now
      // shows the plan BEFORE the dramatized search — jumping to either
      // stage's real elapsed value here would make the HUD run backward
      // two steps later. Left at whatever "ticket" showed (0:00).
    },
  },
  {
    id: "write-limit-tests",
    scene: "vscode",
    title: "Tests for the limit",
    caption: "Four new cases in test/atm.limit.test.ts — over the limit, under it, decimals, cumulative.",
    narration:
      "Plan approved. First step: four tests for a limit that does not exist yet, written before a single line " +
      "of COBOL changes.",
    narrationSide: "left",
    vscode: {
      openFile: "atm.limit.test.ts",
      panel: "none",
      explorerSelected: "test/atm.limit.test.ts",
      highlightLines: [
        [20, 20],
        [26, 26],
        [31, 31],
        [36, 36],
      ],
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
      ],
      timerElapsedMs: msSinceLoopStart("tests-limit-written"),
    },
  },
  {
    id: "limit-tests-red",
    scene: "vscode",
    title: "Red, as expected",
    caption: "6 green, 2 red — the limit doesn't exist yet.",
    narration: "The new tests fail — for the right reason: the host still says SENDING 10001 DOGE.",
    narrationSide: "left",
    vscode: {
      openFile: "atm.limit.test.ts",
      panel: "terminal",
      panelExpanded: true,
      explorerSelected: "test/atm.limit.test.ts",
      highlightLines: [
        [20, 20],
        [26, 26],
        [31, 31],
        [36, 36],
      ],
      terminalAnsi: "vitest-2-limit-red",
      terminalReplay: true,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
        assistantRunningWholeSuiteChat,
        bashRunAllTestsRedChat,
        assistantRedSummaryChat,
      ],
      timerElapsedMs: msSinceLoopStart("tests-limit-run"),
    },
  },
  {
    id: "read-agents",
    scene: "vscode",
    title: "Orientation",
    caption: "AGENTS.md first: the code map, the host, the compiler's dialect.",
    narration:
      "It starts with AGENTS.md — our notes for any assistant: which program does what, how to reach the host, " +
      "that the compiler speaks a 1974 dialect. Then the COBOL.",
    narrationSide: "left",
    vscode: {
      openFile: "AGENTS.md",
      panel: "none",
      explorerSelected: "AGENTS.md",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
        assistantRunningWholeSuiteChat,
        bashRunAllTestsRedChat,
        assistantRedSummaryChat,
        assistantBeforeTouchingChat,
        readAgentsMdChat,
      ],
    },
  },
  {
    id: "read-dogesend",
    scene: "vscode",
    title: "Getting oriented",
    caption: "A grep instead of a guess — MOVE-SOME-DOGE is the only place a send is accepted.",
    narration:
      "It reads the program and greps for the paragraph. No approvals for reading — nothing on the host changes.",
    narrationSide: "left",
    vscode: {
      // The program BEFORE the change — tab reads "DOGESEND.cbl" (paths.ts
      // maps this key to the real workspace path), scrolled to the
      // paragraph the search below finds.
      openFile: "DOGESEND.v0.cbl",
      scrollToLine: 113,
      highlightLines: [[113, 113]],
      panel: "none",
      explorerSelected: "cobol/DOGESEND.cbl",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
        assistantRunningWholeSuiteChat,
        bashRunAllTestsRedChat,
        assistantRedSummaryChat,
        assistantBeforeTouchingChat,
        readAgentsMdChat,
        assistantAgentsRuleChat,
        readDogesendChat,
        searchChat,
      ],
      timerElapsedMs: msSinceLoopStart("search"),
    },
  },
  {
    id: "diff-v0-v1",
    scene: "vscode",
    title: "First cut: DOGESEND.cbl",
    caption: "The tracker record, the CHECK-DAILY-LIMIT / RECORD-DAILY-TOTAL paragraphs, a hand-rolled amount parse.",
    narration:
      "The change: a tracker record in the VSAM file, today's date, a running total, a refusal message. Written for a 1974 COBOL.",
    narrationSide: "left",
    vscode: {
      openFile: "DOGESEND.v1.diff",
      editorMode: "diff",
      diffOf: ["DOGESEND.v0.cbl", "DOGESEND.v1.cbl"],
      panel: "none",
      explorerSelected: "cobol/DOGESEND.cbl",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
        assistantRunningWholeSuiteChat,
        bashRunAllTestsRedChat,
        assistantRedSummaryChat,
        assistantBeforeTouchingChat,
        readAgentsMdChat,
        assistantAgentsRuleChat,
        readDogesendChat,
        searchChat,
        assistantChangeChat,
        editV1Chat,
      ],
      timerElapsedMs: msSinceLoopStart("edit-v1"),
    },
  },
  {
    id: "upload-approval",
    scene: "vscode",
    title: "Writing to the host",
    caption: "Edits were pre-approved; a write to the mainframe still asks.",
    narration:
      "Local edits were pre-approved with the plan. Writing to the mainframe is different: the upload and the " +
      "compile job wait for me.",
    narrationSide: "left",
    hotspot: { target: "chat-approve", label: "Approve the upload" },
    vscode: {
      openFile: "COMPSEND.jcl",
      panel: "none",
      explorerSelected: "jcl/COMPSEND.jcl",
      chatInput: "idle",
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
        assistantRunningWholeSuiteChat,
        bashRunAllTestsRedChat,
        assistantRedSummaryChat,
        assistantBeforeTouchingChat,
        readAgentsMdChat,
        assistantAgentsRuleChat,
        readDogesendChat,
        searchChat,
        assistantChangeChat,
        editV1Chat,
        writeJclChat,
        assistantNowMainframeChat,
        uploadSubmitV1Chat,
      ],
      timerElapsedMs: msSinceLoopStart("jcl-written"),
    },
  },
  {
    id: "compile-v1-fails",
    scene: "vscode",
    title: "Upload, compile — RC 12",
    caption: "This OS/VS COBOL predates UNSTRING and INSPECT; the compiler doesn't know either one.",
    narration:
      "Uploaded through Panelwright, compiled by a job, listing fetched back — return code 12: this compiler has " +
      "no UNSTRING or INSPECT. I switch on auto mode and let it work.",
    narrationSide: "left",
    hotspot: { target: "chat-automode-toggle", label: "Turn on auto mode" },
    vscode: {
      openFile: "COMPSEND.jcl",
      panel: "none",
      explorerSelected: "jcl/COMPSEND.jcl",
      autoMode: false,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
        assistantRunningWholeSuiteChat,
        bashRunAllTestsRedChat,
        assistantRedSummaryChat,
        assistantBeforeTouchingChat,
        readAgentsMdChat,
        assistantAgentsRuleChat,
        readDogesendChat,
        searchChat,
        assistantChangeChat,
        editV1Chat,
        writeJclChat,
        assistantNowMainframeChat,
        { ...uploadSubmitV1Chat, approval: "resolved" },
        fetchListingV1Chat,
        rc12ResultChat,
        rc12AssistantChat,
      ],
      timerElapsedMs: jobOutput2MsFromLoopStart,
    },
  },
  {
    id: "diff-v1-v2",
    scene: "vscode",
    title: "Second cut: hand-rolled parsing",
    caption: "SCAN-AMOUNT / COPY-INT-DIGIT / COPY-DEC-DIGIT replace UNSTRING and INSPECT with subscripted MOVEs.",
    narration: "A subscripted table and EXAMINE instead. Return code 4, link-edit clean.",
    narrationSide: "left",
    vscode: {
      openFile: "DOGESEND.v2.diff",
      editorMode: "diff",
      diffOf: ["DOGESEND.v1.cbl", "DOGESEND.v2.cbl"],
      panel: "none",
      explorerSelected: "cobol/DOGESEND.cbl",
      autoMode: true,
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
        assistantRunningWholeSuiteChat,
        bashRunAllTestsRedChat,
        assistantRedSummaryChat,
        assistantBeforeTouchingChat,
        readAgentsMdChat,
        assistantAgentsRuleChat,
        readDogesendChat,
        searchChat,
        assistantChangeChat,
        editV1Chat,
        writeJclChat,
        assistantNowMainframeChat,
        { ...uploadSubmitV1Chat, approval: "resolved" },
        fetchListingV1Chat,
        rc12ResultChat,
        rc12AssistantChat,
        editV2Chat,
        resubmitV2Chat,
        runAllTestsChat,
      ],
      timerElapsedMs: msSinceLoopStart("tests-run-3"),
    },
  },
  {
    id: "green",
    scene: "vscode",
    title: "Green",
    caption:
      "All 8 tests pass against the live host — the limit works, nothing regressed. " +
      '(Scrolled to "counts withdrawals cumulatively within the day".)',
    narration: "Eight tests green, live against CICS — the four old ones untouched.",
    narrationSide: "left",
    timerStop: true,
    vscode: {
      autoMode: true,
      openFile: "atm.limit.test.ts",
      panel: "terminal",
      panelExpanded: true,
      explorerSelected: "test/atm.limit.test.ts",
      terminalAnsi: "vitest-3-after-v2",
      terminalReplay: true,
      scrollToLine: 38,
      highlightLines: [[36, 41]],
      sessionTitle: TICKET_SESSION_TITLE,
      chat: [
        promptChange,
        thinkingItem2,
        assistantPlanChat,
        { ...planApprovalPending, approval: "resolved" },
        assistantImplementingChat,
        writeLimitTestsChat,
        assistantRunningWholeSuiteChat,
        bashRunAllTestsRedChat,
        assistantRedSummaryChat,
        assistantBeforeTouchingChat,
        readAgentsMdChat,
        assistantAgentsRuleChat,
        readDogesendChat,
        searchChat,
        assistantChangeChat,
        editV1Chat,
        writeJclChat,
        assistantNowMainframeChat,
        { ...uploadSubmitV1Chat, approval: "resolved" },
        fetchListingV1Chat,
        rc12ResultChat,
        rc12AssistantChat,
        editV2Chat,
        resubmitV2Chat,
        runAllTestsChat,
        assistantGreenSummaryChat,
      ],
      timerElapsedMs: msSinceLoopStart("tests-run-3"),
    },
  },
  {
    id: "after-refused",
    scene: "atm",
    title: "50,000 DOGE, refused",
    caption:
      `The same withdrawal now stops at the door — DAILY LIMIT ${DAILY_LIMIT} DOGE EXCEEDED. ` +
      "(0.5 DOGE right after: still accepted — see atm-after-0.5.txt.)",
    narration: "Same ATM, same 50,000 — declined. Daily limit.",
    atm: {
      amount: "50000",
      result: "refused",
      message: `DAILY LIMIT ${DAILY_LIMIT} DOGE EXCEEDED`,
      screenSvg: "atm-after-50000/04-send-result",
      showThreeTwoSeventy: true,
    },
    diagram: { highlight: ["dogesend"] },
  },
  {
    id: "compare",
    scene: "compare",
    title: "Agent loop vs. manual",
    caption:
      "The same change, timed: the measured agent loop against a manual path built from measured mechanics, typing at a stated rate and an estimate of thinking time.",
    narration:
      "Measured: minutes. By hand: hours. Giving the AI agent the same tools that developers have enables it to deliver fully tested code.",
  },
];
