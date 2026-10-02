# Collecting the material for a demo like this one

This page tells a Claude Code session on another machine what to record while
it does a real task, so that a demo like `demo-atm-limit` can be built from the
recording here, without access to that machine. It was written for this
variant: Claude Code on a workstation connected to a real z/OS, a CICS
application similar to DOGECICS, a similar ticket (a rule added to an
existing transaction, test-first), sources in Endevor, HB.js as the bridge
between the client and CICS and as the test runner, Panelwright used only to
capture 3270 screens.

The demo replays the recording at presentation pace. It never shows a number,
a tool result, a listing or a screen that was not captured; when something is
dramatized (an explanation the assistant did not literally say, a tool that
does not exist yet) the code says so and the design record lists it. So the
quality of the demo is the quality of this archive. Collect more than you think
is needed; we can drop, we cannot invent.

## 1. What the archive is for

The demo app (`app/`, see `app/README.md`) is a reusable kit plus one `demo/`
module. Building a new `demo/` needs, per slide kind:

| Slide | Needs from the archive |
|---|---|
| Client app (the ATM) before/after | the client's own output, the real 3270 screens behind it (SVG + text), the host's exact messages, the balance/recipient/currency shown |
| Architecture strip | the real component chain (client → HB.js → CICS region → program → data set/DB2), names as they may appear publicly |
| Process diagrams, compare bars | `timings.jsonl` stage stamps from the agent run; measured or estimated mechanics of the manual path |
| VS Code + Claude Code steps | the session transcript (every prompt, tool call, tool result, timestamp), the source files at each version, test outputs, listings, the Explorer tree (here: the Endevor inventory), screenshots of the real extension |
| Approvals, MCP tools | the real tool names and payloads of the Endevor MCP; the `hb` CLI commands as actually run; screenshots of the real permission prompts |

## 2. Archive layout

One `zip` or `tar.gz`, named `<app>-demo-captures-<yyyy-mm-dd>`. Paths below
are inside it. Every file is verbatim output unless it is one of the three
hand-written files (`FACTS.md`, `REDACTIONS.md`, `MANIFEST.md`).

```
MANIFEST.md                     every file, one line: what it is, which run produced it, re-take or original
FACTS.md                        the facts sheet (section 9)
REDACTIONS.md                   what was scrubbed and how (section 10)
session/
  claude-session.jsonl          the Claude Code transcript of the agent run (section 4)
  prompt.md                     the ticket as typed, verbatim
  plan.md                       the assistant's plan, verbatim
  timings.jsonl                 stage stamps (section 7)
  environment.txt               versions: Claude Code, the VS Code extension, model + effort, permission mode, hb, Endevor MCP, z/OS + CICS levels
  mcp/
    endevor-tools.json          the Endevor MCP's tool list with schemas, as the client sees it
    endevor-calls.jsonl         every Endevor MCP call of the run: {tool, input, output, epochMs} (section 5)
    hb-mcp-proposal.md          if a future HB.js MCP is planned: tool names + argument shapes; otherwise "none, design it"
  hb-log.txt                    every `hb` command as run: "$ hb …" line, then stdout+stderr, exit code, wall time
  host-log.txt                  every Panelwright command as run (screens), same format
code/
  endevor-inventory.txt         environment/stage/system/subsystem/type/element/version for every element the run touched
  AGENTS.md                     the MD element AGENTS, as retrieved
  cobol/<PROGRAM>.v0.cbl        the program before the change
  cobol/<PROGRAM>.v1.cbl        after the first edit (even if it did not compile)
  cobol/<PROGRAM>.v2.cbl        after the fix, the version that went green (more if there were more)
  cobol/<PROGRAM>.v1.diff, v2.diff
  cobol/<other elements>        maps, copybooks, anything else retrieved or changed, each version
  js/<client>.js                the client that talks to CICS through HB.js
  js/<regression tests>.js      the JS elements that pin existing behaviour, as retrieved
  js/<new tests>.js             the tests added for the ticket, each version written
  jcl/…                         any JCL used (if the Endevor generate processor is what compiles, nothing here — say so)
listings/
  generate-1-<element>.txt      the Endevor GENERATE output + compiler listing for every generate, in order, with the return code
  generate-2-<element>.txt      …
tests/
  run-1-regression.txt          the existing tests, green (plain text, no colour codes)
  run-2-new-tests-red.txt       the new tests failing before the change
  run-3-all-green.txt           everything green after the change (add run-N for every run in between)
screens/
  before/NN-<name>.svg + .txt   the CICS transaction driven by hand or by the client BEFORE the change: menu, form, result
  after/NN-<name>.svg + .txt    the same after the change: the refusal, and one accepted send
client/
  before.txt                    the client's own output for the "before" transaction (e.g. `hb …` or `node client.js send 50000`)
  after-refused.txt, after-accepted.txt
ui/
  NN-<state>.png                screenshots of the real VS Code + Claude Code extension (section 8)
  NN-<state>.txt                the panel's visible text at that moment (DOM innerText), when you can get it
manual/
  mechanics.jsonl               measured operator mechanics (section 6), or "not measured"
  notes.md                      how they were measured, by whom, what was estimated
```

## 3. Running the agent session

Do the real task once, end to end, in ONE Claude Code session in the VS Code
extension, on the local workspace that mirrors the Endevor elements (retrieve
before you start). The story we replay is the session, so its shape matters:

1. Start with the existing tests: "What tests do we have for <client>?" —
   let the assistant find them; then "Run the tests" — the regression run.
2. Then the ticket, as one message (save it verbatim as `session/prompt.md`).
   Ask for a plan before any change and for the new tests first.
3. Let it run: plan → new tests → red run → read the sources → change →
   generate in Endevor → listing → (fix and regenerate if it fails) → green.
4. Then drive the transaction once more by hand or with the client to
   capture the "after" screens.

Rules that make the recording usable:

- **Permission mode `default`, not auto** — we need to see the real
  permission prompts for a Write, a Bash/`hb` call and an MCP call
  (screenshots, section 8). Switch to auto later in the run if you want the
  loop to run unattended; stamp the moment (section 7).
- **Do not clean up mid-run.** A first edit that fails to compile is the
  best beat in the demo; keep every version and every listing.
- **Keep AGENTS in play**: the local workspace should contain the retrieved
  `AGENTS.md` (from the MD element AGENTS), loaded through `CLAUDE.md`
  (`@AGENTS.md`) the same way this example does.
- One session, one workspace, no `/clear`. If you must start a second
  session, keep both transcripts and say which is which.
- If the run does not hit a compile error, do not manufacture one; say so in
  `FACTS.md` and we show a straight run.

## 4. The transcript

The single most valuable file. Claude Code writes every session to
`~/.claude/projects/<workspace-slug>/<session-id>.jsonl`: every user message,
every assistant message, every tool call with its full input and result,
with timestamps. Copy that file to `session/claude-session.jsonl` unchanged
(scrub per section 10 afterwards, on a copy). Find it by modification time
right after the run; the slug is the workspace path with `/` turned into `-`.

Also export, from the extension UI if it offers it, the visible text of the
whole conversation (`session/conversation.txt`) — the transcript has the
data, the UI text tells us the exact wording the panel showed (tool row
titles like `Read AGENTS.md`, `Bash  Run the tests`, MCP rows).

## 5. Tools: Endevor MCP, hb, Panelwright

**Endevor MCP.** The demo will render its calls as they really look, so we
need the real names and shapes. Capture (a) the tool list with schemas
(`claude mcp list`, then the tool descriptions as the client shows them, or
the server's own `tools/list` response) into `session/mcp/endevor-tools.json`;
(b) every call the run made, verbatim, into `session/mcp/endevor-calls.jsonl`
(the transcript already has them; this file is the extraction, one JSON
object per line with `tool`, `input`, `output`, `epochMs`). Include the
retrieve of AGENTS, the retrieves of the sources, every add/update, every
generate and its output.

**hb.** Every command the assistant or you ran, in `session/hb-log.txt`,
in this format (it is what the demo parses):

```
$ hb <args exactly as typed>
<stdout and stderr, verbatim>
[exit 0 · 3.4 s]
```

If a future HB.js MCP server is planned, write its intended tool names and
argument shapes in `session/mcp/hb-mcp-proposal.md` so the demo's faked MCP
rows match what will ship. If nothing is planned, say so; we will derive
tool names from the CLI verbs and label them as invented.

**Panelwright** (screens only): `session/host-log.txt`, same `$` format.

## 6. Tests and listings

- Test outputs as plain text, with colour off (`FORCE_COLOR=0`, or `--no-color`
  if `hb` has it), one file per run, in the order run. Keep the command line
  at the top of each file. We colour by marker (✓, ×, FAIL) in the demo.
- Every Endevor GENERATE: the full processor output and compiler listing,
  including the return code line and every diagnostic. A listing is the
  compile-error beat and the "100-page listing" of the manual path, so keep
  it whole even when it is long.
- The JS tests as retrieved elements, every version that was written.

## 7. Timings

Everything the demo says about time comes from `session/timings.jsonl`. One
JSON object per line:

```
{"stage":"start","t":"2026-10-02T09:14:03Z","epochMs":1790000000000,"note":"ticket sent"}
```

Stamp these stages (add your own; keep the names where they fit):
`start` (first prompt sent), `tests-regression-run`, `plan`,
`tests-new-written`, `tests-new-run` (red), `read-sources`, `edit-v1`,
`generate-1`, `listing-1` (fetched, with RC), `edit-v2`, `generate-2`,
`listing-2`, `tests-run-3` (green), `auto-mode-on` (if switched),
`after-screens`. A stamp is the wall clock at the moment the thing
finished; a shell helper is enough:

```sh
stamp() { printf '{"stage":"%s","t":"%s","epochMs":%s,"note":"%s"}\n' \
  "$1" "$(date -u +%FT%TZ)" "$(($(date +%s)*1000))" "$2" >> session/timings.jsonl; }
```

The transcript's own timestamps are the cross-check; stamps you forgot can be
recovered from it, stamps you invented cannot.

**Manual baseline.** The compare slide puts the agent's minutes against a
human doing the same ticket by hand. If a developer can be timed doing the
mechanical parts (retrieve, edit, add/update, generate, page the listing,
run the transaction by hand), record each in `manual/mechanics.jsonl`
(`{"step":"page listing","seconds":178,"how":"stopwatch, 89 screens"}`).
What cannot be timed, estimate and label as an estimate in `manual/notes.md`,
with the assumptions (typing rate, who the developer is). The demo shows
measured, typed and estimated time as three different textures and says
which is which.

## 8. Screenshots of the real UI

The demo copies the real extension's look; every visual choice traces to a
screenshot. From YOUR VS Code, at YOUR font size, full window, PNG:

1. The empty Claude Code panel, no session.
2. The input mid-typing, before send.
3. A turn in flight: the "✻ Verb…" status row, orange input border, stop button.
4. Tool rows: `Read`, `Bash` (an `hb` command), a **Write**, and an **MCP call**
   (how the Endevor tool appears: server name, tool name, the expanded
   IN/OUT).
5. **A permission prompt** for each of: a Write, a Bash/`hb` call, an MCP
   call — the exact buttons and wording. This is the one element the
   existing demo could not verify.
6. The plan-mode prompt ("Would you like to proceed?") if plan mode is used.
7. The final answer of a turn.
8. The Explorer with the workspace, and whatever Endevor tree view you use.

Name them `ui/NN-<state>.png`; when you can, save the panel's visible text
next to it as `.txt` (select-all in the panel, or the DOM's `innerText`).

## 9. `FACTS.md` — the facts sheet

Short, but every line matters:

- Application and transaction names, program names, map names, file/DB2
  names, the region name — as they may appear in a demo shown outside the
  team. If a name must not appear, give the replacement here.
- The ticket in one sentence; the rule that was added; the exact host
  messages before and after (accepted, refused).
- What the client shows: balance, recipient, currency, unit symbol; the
  amounts used for the before/after transactions.
- The component chain for the architecture strip, in order.
- Model and effort used, Claude Code and extension versions, permission mode
  and when it changed.
- What is real vs what is to be faked in the demo: which Endevor MCP tools
  were really called; that HB.js was really driven through `hb` and should
  appear as an MCP; that HB.js↔Endevor integration is assumed although the
  test system has none (say what a developer would really do there).
- Anything that did NOT happen (no compile error, no approval shown, a test
  that was flaky) so the demo does not pretend it did.

## 10. Redaction

Only the scrubbed archive leaves the machine. Scrub on copies, keep the
originals where they are, and record every substitution in `REDACTIONS.md`
(what kind of value, what it became — never the original). Always remove:
passwords, tokens, API keys, session ids, anything under `~/.claude/*.json`
other than the transcript. Decide and state: user ids, LPAR/host names,
region names, internal URLs, real customer data in test records. A 3270
capture and a compiler listing both carry user ids in places you will not
expect (job cards, data set names, `IEF` messages, the listing header), so
grep the whole archive for each value you replaced, not only the files you
expect it in. If the transcript quotes a secret (a `hb` login line), replace
the value inside the JSON string and say so.

## 11. Packaging checklist

- [ ] `MANIFEST.md` lists every file; re-takes (anything captured after the
      measured run) are marked as such
- [ ] `session/claude-session.jsonl` present and readable (`jq -c .type` over
      it runs clean)
- [ ] `timings.jsonl` covers at least start, red run, first generate,
      green run
- [ ] every source version and every listing, in order, with return codes
- [ ] three test outputs, plain text
- [ ] before/after screens as SVG + text, with the host messages visible
- [ ] Endevor tool schemas and calls; `hb-log.txt`
- [ ] UI screenshots 1–8, including the permission prompts
- [ ] `FACTS.md`, `REDACTIONS.md`
- [ ] the archive grepped for every redacted value; none found

Send the archive and, separately, the one thing that cannot be archived: ten
minutes of the person who ran it answering "what surprised you".
