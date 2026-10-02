# Demo: an AI assistant adds a daily limit to DOGECICS through Panelwright (PW-477)

> **Status: measured run DONE 2026-09-24; demo app and manual baseline IN
> PROGRESS.** The agent loop was run for real once, end to end, against
> `tk5probe` (`panelwright/tk5plus`, port 3271) and every artefact the demo
> replays lives in `demo-atm-limit/captures/run1/`. Nothing in the
> demo app talks to a host; it replays those captures, so it runs anywhere.

## 1. What the demo shows

A Doge ATM (`demo-atm-limit/atm/atm.ts`, ~170 lines over
`@panelwright/core`) withdraws 50 000 DOGE from the DOGECICS demo application
because its `DOGESEND` program has no daily limit — it moves the typed amount
straight into a spool record, validating nothing. The same transaction is
shown on the real 3270 screen. A Claude Code session in VS Code then adds a
10 000 DOGE/day limit test-first, driving the host through the Panelwright
CLI, and the ATM ends up refusing the same withdrawal.

The presenter advances a VS Code-lookalike web app (`app/`) by keyboard or by
clicking the highlighted widget; approvals of the assistant's tool calls are
clicked by hand until the presenter flips "auto mode", after which the loop
runs unattended to green.

## 2. Decisions

- **D1 — Everything replayed is a real capture from one measured run**; the
  app is a static Vite/React build with no backend. Sources are highlighted
  at build time by Shiki with VS Code's own Dark Modern theme and the
  spgennard COBOL / dkelosky JCL TextMate grammars (both MIT); terminal
  output is the vitest ANSI stream replayed in xterm.js; 3270 screens are
  `Session.renderSvg()` exports.
- **D2 — The COBOL change is real and stays in one program.** A tracker
  record under key `0000000000` in the existing `DOGEVSAM` KSDS (it sorts
  before every real record, so the balance read and the history browse skip
  it) holds the date and the running total; `ASKTIME`/`FORMATTIME YYYYMMDD`
  (KICKS requires `DATESEP`) gives the day; `READ … UPDATE` + `REWRITE`, or
  `WRITE` on `NOTFND`, with `RESP`. No map change, so the existing tests and
  transactions are untouched. Limit exceeded → `DAILY LIMIT 10000 DOGE
  EXCEEDED` on the send screen's status line, amount field highlighted, no
  spool record.
- **D3 — Regression first.** Four characterization tests (balance, recent
  transactions, invalid-address rejection, a plain send) are written and
  green BEFORE the limit tests, and stay green after — Petr's addition on
  2026-09-24, and the thing that makes "no regressions" a claim with
  evidence.
- **D4 — The story shows what happened, not what was scripted.** The plan
  expected a failing edge-case test after the first compile; reality was a
  compile error (RC 12 — this OS/VS COBOL predates `UNSTRING` and
  `INSPECT`, which the compiler read as paragraph names) and a green first
  test run against the working program. Petr chose the compile-error beat
  (more mainframe-specific, and true) over staging a second failure.
- **D5 — The manual baseline is the mechanical operator path, measured, plus
  typing at a stated rate.** A hand drive through the CLI is what the agent
  loop already was, so the baseline is: logon, REVEDIT navigation and
  insert/delete mechanics, SUBMIT, paging the listing on the terminal,
  KICKS restart, four hand tests at the DSND screen — all timed live by
  `scripts/manual-path.ts` — while the 142 lines / 4 419 characters of COBOL
  a human would type are costed at a rate the chart states. Thinking and
  design time are excluded on both sides and the chart says so.
- **D6 — Limit 10 000 DOGE/day, tests spend ~1 105 DOGE per run**, so about
  nine full runs fit in one host day before "under the limit" stops being
  true; `jcl/RESEED.jcl` restores the seed VSAM when needed.

- **D7 — The regression suite pre-exists (Petr, 2026-09-25).** The story
  opens with the assistant finding and running `test/atm.regression.test.ts`
  (a narrative exchange: the real run's prompt asked for those tests), so
  the agent loop's stopwatch starts at the stamp `tests-regression-run`
  and ends at `tests-run-3`: **8:12** instead of 9:24; the "same
  deliverable" manual bar adds only the four limit tests (1 364 chars).
- **D8 — Narration is data.** Each step carries the sentences Petr says,
  shown as callouts a status-bar control hides; the arc: explain the app,
  show the missing rule, the limit is a hard-coded 10 000 (a configurable
  limit is the next ticket). `AGENTS.md` in the example is real and shown
  as "Using AGENTS.md" in the panel (a presenter device — the extension
  loads it silently). Balance 200,050.00 and recipient "Petr Plavjanik"
  are real on the host (re-seeded 2026-09-25, `jcl/RESEED.jcl`; the
  recipient is `ATM_RECIPIENT` in `atm/atm.ts`, `DEMO_RECIPIENT` in the app).

## 3. The measured agent loop (2026-09-24, `captures/run1/timings.jsonl`)

| Stage | Wall clock | Note |
|---|---|---|
| Characterization tests written, run | 1:12 | 4/4 green, 25 s of it is the DOGE lifecycle |
| Limit tests written, run | 0:48 | 2 red: host answered `SENDING 10001 DOGE` |
| Search + plan | 0:32 | `grep` → `MOVE-SOME-DOGE`; `plan.md` |
| COBOL edit v1 + DOGESEND-only JCL | 2:26 | |
| Upload, SUBMIT, compile, fetch listing | 1:31 | job ran in 6 s; one IND$FILE idle-timeout retry on the 2 573-line OUTLIST |
| Read RC 12, rewrite parsing for OS/VS COBOL (table + `EXAMINE`) | 1:50 | |
| Recompile (COB1 RC 4, LKED 0), log off, tests | 1:06 | **8/8 green** |
| **Prompt → green** | **9:24** | plus 2:00 of ATM after-checks: 50 000 refused, 0.5 accepted |

What the app replays versus what was measured: the timings above are the
single measured run. Three artefacts were RE-TAKEN afterwards for the
presentation, content-identical and labelled as such in `captures/run1/`:
the RC 12 listing (`job-rc12-rerun-JOB00039.outlist` — the original
`JOB00037` listing was overwritten by a 0-byte re-fetch during the run, so
the identical v1 source was recompiled; its diagnostics match line for
line), the "before" 3270 screens at 50 000 DOGE (`atm-before-50000/`, the
measured run's before-screens were taken at 1 DOGE), and run 1's transcript
with the verbose reporter — and again on 2026-09-25, after Petr had the
suite split into `atm.regression.test.ts` + `atm.limit.test.ts`, so the
transcripts show the file names the explorer shows (same tests, same
outcomes). Vitest emits
no colour when piped, so the terminal panel colours the plain transcripts
by their own markers (✓/×/FAIL) — real text, synthetic colour.

Hazards met on the way, worth keeping: `STATUS <jobname>` lists EVERY job of
that name, newest last — parse the id from the line you mean, and never
`OUTPUT … PRINT()` an id whose held output is gone (it clobbers the capture,
as `docs/design/zowe-provider-design.md` D17 warns; it happened here to
`JOB00037.OUTLIST` after the local copy was safe).

## 3b. What on screen is captured, what is narrative (2026-09-25 round)

Petr asked for the chat panel to look like the real Claude Code extension —
so a reference session was run in the real extension (v2.1.280) on this
example and screenshotted (`scratchpad/ccref/`, not committed), and the
app copies its grammar: prompt bubble, dotted rail, `Read <file>` rows,
prose with code pills, the input box and its streaming state. Everything a
row SHOWS is captured text (host CLI lines, transcripts, the RC 12
diagnostics, the plan). Three things are narrative and say so in code
comments: the two `Read DOGEMAIN.cbl` / `Read DOGESEND.cbl` rows after the
prompt (the sources WERE read, but before the stopwatch started — the
timed run's first stage is the tests), the approval card's wording (the
CLI's `Yes` / `Yes, and don't ask again this session` / `No`; the real
extension's prompt was never seen because this machine runs in auto mode),
and the auto-mode toggle itself (a presenter device, not an extension
control). The on-screen prompt is the short one Petr asked for; the prompt
the measured run actually received is `captures/run1/prompt.md`. Row
durations come from `timings.jsonl` deltas or the CLI lines' own timings;
rows without a measurement show none.

## 3c. The 2026-09-25 review round (Petr's `review.md`, 12 notes)

What changed and what is now narrative, so the list in §3b stays true:

- **Approvals mean something.** No card on a Read or a Search any more.
  Two pending cards remain: the PLAN (Claude Code's own plan-mode prompt,
  "Would you like to proceed?" with "Yes, and auto-accept edits" / "Yes,
  manually approve edits" / "No, keep planning") and the HOST UPLOAD (the
  `Bash` upload+SUBMIT row, the CLI's three-choice wording). Local edits
  are pre-approved by the plan choice; the second upload would ask again,
  which is the stated reason the presenter flips auto mode after RC 12.
- **The in-flight status row is real.** The reference screenshot
  `08-read-prompt-running-1.png` shows an orange spinner glyph and a verb
  ("✻ Cerebrating…") as the last row while a turn runs; the app renders
  that whenever the panel is working (derived: streaming, everything
  revealed, last item not an answer or a pending card). The verb list is
  Claude Code's own (verbatim from the CLI bundle, `spinnerVerbs.ts`) plus
  a mainframe-flavoured set that is the demo's own; the cadence is
  presentation pacing.
- **Two sessions.** The warm-up ("What tests do we have for the ATM?" →
  Search, Read, answer; then "Run the tests" typed by the presenter → the
  run and a summary) is one session; the ticket starts a clean one. The
  session titles ("Tests for the ATM", "Daily withdrawal limit") stand in
  for the extension's auto-naming.
- **AGENTS.md is read on screen** (`AGENTS.md` and `CLAUDE.md` now show in
  the Explorer; the "Using AGENTS.md" banner is gone) before DOGESEND —
  which is shown as the v0 program under the `DOGESEND.cbl` tab, scrolled
  to `MOVE-SOME-DOGE`, instead of the already-changed file.
- **Narrative assistant text** (every string carries a `narrative` comment
  in `steps.ts`): the plan is a condensed rendering of `plan.md` with
  headings; the change prompt is a paraphrase of `prompt.md` naming the
  hard-coded default and the next ticket; the explanations before the
  limit-test write, the red run, the AGENTS.md read, the DOGESEND read,
  the edit, the upload, after RC 12 (one added sentence), and the three
  run summaries (warm-up, red, green). The red summary quotes the two
  failing test names and the real counts from the capture: 6 green,
  2 red (the four regression tests run in the same file set).
- **Title slide**, ATM wordmark ("DOGE BANK / ATM / No. 0042"), clickable
  presenter-bar cue, scrollable editor, terminal replay at 80 ms/line,
  a summary row that waits for the replay (`revealAfterMs`, computed from
  the capture's line count), the compare slide's zoom-then-to-scale agent
  bars with a funnel, the process slide's "Without an agent" reveal 5×
  slower, and loop-back arcs that wait for their boxes.

Round 2 (same day): the ATM shows the balance AFTER an authorised
withdrawal (150,050.00) — the ATM's own arithmetic, flagged as such in
`AtmMachine.tsx`, because DOGECICS's send only writes a spool record and
never debits DOGEVSAM (the captured main menu after the 50,000 send still
reads 200,050.00; a debiting send would be a separate ticket). The 3270
capture's rows are pinned to the frame width (`textLength`), since a
viewer whose monospace font is fractionally wider than the capturing
machine's spilled the last columns past the frame on Petr's machine.

## 3d. Code layout: a reusable kit and this demo (Petr, round 2)

Petr asked that the widgets be reusable for other demos of Claude Code
driving other applications and tools. `app/src/` now splits into
`kit/` (engine, stage chrome, the VS Code shell with the Claude Code side
bar, the ATM, the diagrams, the title scene — knows nothing about
DOGECICS; every app fact reaches it through `Step` data or the
`PresentationContent` seam, `kit/engine/content.tsx`) and `demo/` (steps,
config, timings, workspace tree, the six architecture boxes, the compare
data, and the `CONTENT` assembly from `src/generated`). The rule "kit
never imports demo or generated" is pinned by
`app/src/kit/kit-boundary.test.ts`, which was watched failing on a
planted import before it went green. `app/README.md` documents the
layout and how to build another demo on the kit. Side effects: the bank
skin's refusal is a generic "TRANSACTION DECLINED" over the real host
message; the narration callout re-measures its keep-clear lift as the
scene settles (it used to sit on the DOGEVSAM box after the ATM reveal).

## 3e. Collecting the next demo's material

`demo-atm-limit/COLLECTING.md` is the brief for a Claude Code
session on another machine (real z/OS, a similar CICS application, sources
in Endevor reached through an Endevor MCP, HB.js as the client bridge and
test runner, Panelwright only for screens): one archive — the session
transcript, stage stamps, every source version and listing, test outputs,
3270 screens, the MCP tool schemas and calls, `hb` command log, real UI
screenshots including the permission prompts, a facts sheet and a
redaction log — from which a new `app/src/demo/` can be built on the kit.

## 3f. The second demo: Techutex Banking (Endevor MCP + HB.js, real z/OS)

Built 2026-09-25 evening from `demo-techutex-limit/captures/run1/`,
the archive a Claude Code session produced on a Broadcom lab LPAR
(`cobol-cowboys` DOT500/DOT5, a $5,000 daily debit ceiling, Endevor
DEV/1/BANKING/DOT, HB.js through the `hb` CLI, CICS TS 6.1, Enterprise
COBOL 6.4). Same app, second entry `techutex.html`, second module
`app/src/demos/techutex/`, same kit. Petr's decisions: build now, adapt the
DOGECICS manual model as labelled estimates, stage COBOL Language Support
diagnostics from the real listing (labelled), a quiet "proposed" badge on
tools that do not exist yet. What is real: three compile rounds (two
genuine rc=12 fixed-format mistakes, then rc=0), four HB.js test runs, the
deploy (CEMT PHASEIN), three Endevor MCP reads with their payloads, five
Panelwright screens, 10:14 from the confirmed regression check to green.
What the transcript revealed and the demo says: the run was a
self-directed rehearsal ("prepare a great demo script") in AUTO permission
mode — the typed ticket, the plan approval and the host-write approval are
staged; `update_element`/`generate_element` and every HB.js MCP tool are
proposed; the "accepted" screen was captured afterwards on account
901123456 (the demo account was already over the ceiling); the change is
an accumulated ceiling (sentinel cutoff date), a true daily window being
the next ticket; the new tests' first run failed on a bug in the tests
themselves (shown, verbatim). Five assistant lines are verbatim from the
transcript, marked `// verbatim`; everything else is `narrative`. The
committed transcript has internal host names and home paths scrubbed
(`REDACTIONS.md`); the derived `timings-from-transcript.jsonl` sits beside
the untouched original. The Endevor tree matches Petr's screenshot of the
real Explorer for Endevor; the JS/MD element types and names are this
demo's assumption. Still wanted: extension screenshots of an MCP tool row
and an MCP permission prompt.

Review round 1 (same evening): fictional ATM face at Petr's request
(NAMIK HRLE, $500,000, a $200,000 debit) over the real $50.00 captures,
said so in the screen note; chat type ~15% larger in both demos; the
warm-up retrieves AGENTS from Endevor first; the plan is grounded in
Endevor searches (real tools, calls not in the run: badge "staged",
outputs derived from the captured source only); edits go through
`update_element`, deploy submits a DEPLOY JCL through Zowe MCP with the
real deploy log as output; the title's "N× faster" is the compare
slide's own number. Product name per Broadcom's HB.js 8.0 documentation
(Folio `broadcom-hostbridge-js`, Getting Started): "HostBridge JavaScript
Engine (HB.js)" — the long form at first mention, "HB.js" after.
Round 2 (2026-09-26): narration callouts render Markdown (kit-wide);
the process diagram's manual side has "Search for sources" at Petr's
15-minute estimate (totals now 2 h 30 / 3 h, ratio 20×), its host lane
became an "MCP tools" lane naming the Endevor, HB.js and Zowe tools in
loop order; page title "Techutex Banking - a Broadcom AI demo". A delegated
"fix" overwrote the untouched `timings.jsonl` capture a second time on a
misreading of the build; reverted — the rule stands: a capture is never
edited, derived files sit beside it.

Review round 4: owner narration replaces the earlier draft text on 13
steps (before-accepted's after-reveal line, the process split, the whole
warm-up, the ticket, the plan-grounding reads, the diff, diagnostics, the
host-write approval, the first RC 12); the warm-up now has the agent say
why it reads AGENTS.md before the read itself (owner: understand how
something is tested before touching it); the plan (`plan` step) is
preceded by ~10 s of visible tool work — the same plan-grounding reads
that used to appear silently, staggered in with pacing delays — instead
of the plan text landing instantly; the standalone "read-agents" step
that re-read AGENTS.md a second time mid-session is removed (owner: "No
need for agents md now. We have seen it before.") since AGENTS.md is now
read once, at the top of the ticket session, via the shared prefix every
later step's chat array builds on; the three DOT5 3270 screens
(captures/run1/screens/02/03/04) are shown with the AMOUNT 1 and ACCOUNT
KEY field text substituted to the demo's own $200,000.00/demo-account
values over the real $50.00 capture — a table in
`app/scripts/prerender.mts`, asserted against the source, never a hand
edit of the capture (owner: "The CICS screen shows old amount."); the
architecture strip's packet dot no longer strands partway to the last box
at a scaled-down window (it was measuring SCREEN pixels against a
DESIGN-space `left`) and its round trip is now 3 s, not 1.5 (owner:
"seems quite quick"); the chat panel's in-flight status row now also
shows between the plan's own staggered tool rows, not only after the
whole turn has settled.

Review round 5: the editor's diff steps now render VS Code's INLINE diff
view (two line-number columns, +/− gutter indicators, red/green line
backgrounds, a collapsed-region bar between hunks, COBOL tokens coloured)
instead of a raw unified patch with +/- prefixes — owner: "Is this the way
how VS Code visualizes the diffs?" (it was not); parser in
`app/src/kit/vscode/diffParse.ts`, both demos. The process diagram's MCP
TOOLS lane has no arrows between tools (they do not call each other) and
subtle dashed links now run from each agent step to the tool it uses
(`ProcessLane.chain`, `ProcessDiagram.links`). The ATM's "press the green
button" cue is an amber arrow beside the ✓ key itself
(`AtmMachine.confirmCue`), not a small label floating over the machine.
Owner narrations on six more steps; "ceiling" → "limit" and "CICSTEST" →
"CICS region" in every demo-authored string (captured outputs untouched);
strip boxes relabelled; the plan's analysis takes ~20 s and adds a staged
"who calls DOT500" search; the deploy step shows generic dataset/host/path
names (at first through a display-time substitution; since the move to
the public `demos` repository the capture files themselves carry the
generic names, recorded in REDACTIONS.md); the compare headline and the process footer say
"~ 10 minutes" (rounded from the measurement) instead of "measured
10:14"; three owner-chosen spinner verbs.

Review round 6: the agent-loop timer pill is off for Techutex
(`PresentationContent.timerHud: false`; DOGECICS keeps it) and the VS Code
status bar no longer carries the narration/review/voice controls on any
demo — the presenter bar is their one home. A narration override in
review mode now records the shipped text it was typed against and is
treated as stale (not applied on stage, marked in review.md and in the
panel) once that text changes — the owner's round-5 edits had re-exported
a round later, typos and all, because the override outlived the fold.

Review round 7 (2026-09-30): the process diagram's agent side is now
CHRONOLOGICAL — `ProcessDiagram.sequence` lists node ids in the order they
happen, one row each (an array entry = nodes that share a row, e.g. an
agent step and the MCP tool it calls), rows aligned across lanes, revealed
row by row; the developer lane has two approvals (plan, Endevor update) and
the agent lane a leading "Analyse + plan" node so the Endevor tool box
first appears with the plan-grounding searches. The Explorer for Endevor
activity-bar icon is the extension's own `resources/logo.svg` (marketplace
package 1.11.5, `PresentationContent.activityBarExtraIconUrl`, drawn as a
CSS mask like VS Code does). The compare slide has a legend for every
colour, sub-pixel agent groups keep a 2 px minimum so the small bar shows
the same sequence as the zoom, and the manual "mechanics" tag comes from
`CompareData.mechanicsBasis` — "measured" for DOGECICS's stopwatch,
"estimate" for Techutex, where the kit had wrongly said "measured".

2026-10-01: a "👤 name" presenter-bar control sets the recipient name on
the ATM face (both ATM steps), persisted per demo in localStorage with a
`?name=` one-shot URL override (`kit/engine/presenterSettings.ts`,
`atmRecipient.tsx`, `NamePopover.tsx`); the Techutex page title is
"Techutex Banking - a Broadcom AI DevOps Demo".

2026-10-02: rounds 9–11 (owner title, no editor on the ticket/plan steps,
"⚙ settings" with the Account Holder Name, collapsible presenter bar, the
voice item only in review mode, no bracketed notes in chat rows). The demos
then moved from the Panelwright repository to this one, public, published
by a Pages workflow. For the public copy the session transcript is
withheld, and the lab system's host, userid, dataset prefix and CICS
region are replaced with generic names in the capture files
(`demo-techutex-limit/captures/run1/REDACTIONS.md`); a test fails the
build if such an identifier reappears.

## 3g. Spoken narration (2026-09-26)

Petr asked for his cloned voice on the narration. The kit now has two
sources: LIVE — the XTTS-v2 server in his local-ai stack (`:8085`, voice
`tata`, OpenAI-shaped `/v1/audio/speech`, ~20–90 s per narration on the
Mac Studio, so the app prefetches and caches clips in IndexedDB) and
RENDERED — `scripts/render-narration.mts` writes `public/narration/<demo>/
<step>[.after].mp3` + a manifest keyed by the text's hash, and the page
plays a clip only while its text still matches. Speaker button on every
callout, `V` key, autoplay, a voice popover in the status bar;
`?tts=&voice=&narration=live|rendered` for a quick start. Facts: the XTTS
server needed CORS enabled (added to `services/xtts-server.py` in the
local-ai repo); the Kokoro fallback on `:8000` returned empty audio and
is unverified; live mode cannot run from the https site (mixed content),
rendered clips can; XTTS-v2 weights are CPML non-commercial — the final
engine for shipped clips is Petr's decision. Rendered files stay
gitignored until he has chosen voice and text.

## 4. Story (20 steps)

Title → ATM withdraws 50 000 (the architecture strip under it animates
the packet, the same on the real 3270) → the two processes side by side
(without an agent / with Claude Code + Panelwright) → VS Code: "What
tests do we have?", the regression suite found and opened → "Run the
tests", green, summarised → a clean session: the ticket typed, timer
starts → the plan, approved → limit tests written → red, for the right
reason → AGENTS.md read → DOGESEND read and grepped → edit (diff) →
upload approval → submit + RC 12 listing (presenter flips auto mode) →
rewrite, recompile RC 4/0 → 8/8 green on `atm.limit.test.ts` scrolled to
the cumulative test, timer stops, summarised → ATM refuses 50 000 →
agent vs manual.

## 5. Manual baseline (measured mechanics + typing at a rate + thinking estimate)

Petr's 2026-09-25 decision: thinking time counts. So the manual bars are
built per stage from three labelled parts, all printed on the slide:

- **mechanics, measured** on `tk5probe` (`captures/manual1/mechanics.jsonl`):
  logon to READY 5.5 s, `REVED` to the editor 2.7 s, paging the 275-line
  member 13.6 s, leaving the editor 13.7 s, `SUBMIT` to `ON OUTPUT QUEUE`
  8.3 s, and the compile listing paged on the terminal with `OUTPUT` is
  **89 screens** (2 025 rows) — costed at 2 s per ENTER-and-skim; the KICKS
  lifecycle 25 s and a hand send ~15 s from `run1`.
- **typing** at a stated 150 chars/min: 4 419 chars for the v0→v2 change
  (142 lines), 1 600 for the v1→v2 rewrite (49 lines), 2 364 for the eight
  tests — all counted from the shipped files.
- **thinking, an estimate** for a practiced COBOL/CICS developer who knows
  DOGECICS: 10 min reading the ticket and the two programs, 30 min design
  (its own stage since the 2026-09-25 review, so the process diagram's
  "Design" box carries Petr's 30 min), 30 min while writing, 20 min to read
  the RC 12 listing and redesign the parsing, 10 min test plan and reading
  results, 20 min for the four limit tests. Petr chose these defaults
  (2026-09-25). Hand-tested total 150 min, with tests 180 min; the process
  slide rounds them to "≈ 2 h 30 min · 3 h", and its compile-error loop is
  a range — the measured submit+listing mechanics alone (5 min, a one-line
  slip) up to what the measured run hit (30 min, the UNSTRING rewrite).

Two manual bars: **hand-tested** (the four cases typed at the DSND screen)
and **same deliverable** (plus the eight Panelwright tests). The numbers
live in `app/src/story/manualTimings.ts`, the ratio on the slide is
computed, never typed.

The full operator-path driver (`scripts/manual-path.ts`) was built to
measure every keystroke in one run but never completed: creating scratch
members in `HERC02.DOGECICS` failed through IND$FILE from the first
attempt and through REVEDIT after ~20 create/delete cycles —
`captures/manual1/README.md` records the facts, the hypothesis (directory
space) and what it did measure about REVEDIT. Three container restarts
went into it; the numbers above came from existing members in ten minutes.
