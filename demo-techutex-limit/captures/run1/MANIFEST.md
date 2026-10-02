# Manifest

Most files below are from one real, continuous run (2026-09-25, ~16:40-16:51
UTC) against `cobol-cowboys` on `testsys.broadcom.net`. The 3270
screens under `screens/` and `session/environment.txt` were added in a
second pass the same day (~19:32-19:35 UTC), driven live via Panelwright
against a real TPX session on the same LPAR/region -- noted below where it
matters (screen 03 is on `DOT500`'s current, already-deployed post-change
load module, not re-run against v0/v1).

| File | What it is |
|---|---|
| `FACTS.md` | facts sheet -- what's real vs invented, read this first |
| `REDACTIONS.md` | redaction check (nothing found) |
| `session/prompt.md` | the ticket, as given |
| `session/plan.md` | the plan actually followed |
| `session/timings.jsonl` | the run's own stage stamps as recorded (16 rows; three share one second and one is out of order — a capture, kept as it was) |
| `session/timings-from-transcript.jsonl` | derived on import: 22 per-call stamps read from `claude-session.jsonl`, monotonic, second resolution — what the demo's clock uses |
| `session/hb-log.txt` | every `hb`/HB.js command run, verbatim |
| `session/deploy-log.txt` | `syncz task deploy` output (real deploy to CICSTEST) |
| `session/mcp/endevor-tools.json` | real Endevor MCP tools used + 2 invented (update/generate) |
| `session/mcp/endevor-calls.jsonl` | 3 real read calls + 3 invented update/generate calls (shape only; listings are real) |
| `session/mcp/hb-mcp-proposal.md` | invented HB.js MCP tool shapes, derived from the real `hb` CLI |
| `code/endevor-inventory.txt` | DOT500's Endevor location/version/fingerprint before this run |
| `code/cobol/DOT500.v0.cbl` | DOT500 before any change |
| `code/cobol/DOT500.v1.cbl` + `.v1.diff` | after the first edit -- did NOT compile (rc=12, area-A violation) |
| `code/cobol/DOT500.v2.cbl` + `.v2.diff` | final version -- compiles and deployed clean (rc=0) |
| `listings/generate-1-DOT500-build.txt` | compile attempt 1, FAILED (matches v1) |
| `listings/generate-2-DOT500-build.txt` | compile attempt 2, FAILED (intermediate fix, still had a `COPY`-statement column-7 bug; no separate `.cbl` saved for this exact intermediate state) |
| `listings/generate-3-DOT500-build.txt` | compile attempt 3, SUCCEEDED (matches v2) |
| `code/AGENTS.md` | **draft, invented for the demo app** — not the element the real run used (this Endevor mock has no AGENTS.md); modelled on `examples/demo-atm-limit/AGENTS.md` using only facts in this archive, see its own header comment |
| `code/js/postDebit.js`, `getCheckingBalances.js` | the pre-existing HB.js scripts these tests wrap |
| `code/js/dot.regression.test.js` | new: the "existing tests" regression check (inquiry, orthogonal to the change) — actually WRITTEN in this run (16:40:11 per the transcript); the demo still assumes it pre-exists, same device DOGECICS uses, flagged in steps.ts |
| `code/js/dot.dailyLimit.test.js` | new: the ticket's test (debit over the ceiling must be REJECTED) |
| `tests/run-1-regression.txt` | regression test, BEFORE the change -- PASS |
| `tests/run-2-new-test-red.txt` | new test, BEFORE the change -- FAIL (red), as expected |
| `tests/run-3-regression-after.txt` | regression test, AFTER deploy -- PASS |
| `tests/run-4-new-test-green.txt` | new test, AFTER deploy -- PASS (green) |
| `session/claude-session.jsonl` | this task's slice of the Claude Code session transcript (lines 3966-4578 of the full multi-day session file), copied by the user after the classifier blocked me from doing it myself; grepped clean of literal secret values before copying. **The run was a rehearsal, in auto permission mode** — the only real user prompt was "Let's prepare a great demo script…"; the ticket in `prompt.md` was never typed as a message, and no approval prompt ever appeared. The demo still stages the ticket prompt, the plan approval and the host-write approval (they are the story this app tells), each marked narrative/staged in steps.ts. |
| `session/environment.txt` | CLI/model/tool/z-OS/COBOL versions |
| `screens/01-dot5-entry.svg`+`.txt`+`.json` | DOT5 just entered, blank form (account `DEMO`/`101123456`, bank `001`, type `DD`) |
| `screens/02-dot5-filled.svg`+`.txt` | the same form filled exactly as `postDebit.js` fills it (service `TPS`, format `DB`, amount `50.00`), before F2 |
| `screens/03-dot5-rejected.svg`+`.txt` | after F2, on the **currently deployed post-change** `DOT500` (v2, the compiled/deployed version from the first pass) -- `ERROR: DAILY DEBIT LIMIT EXCEEDED` / `CORRECT AND RE-ENTER INPUT FIELD`. `DEMO` expands server-side to `101123456`, which is well over the $5,000 ceiling from same-day testing. |
| `screens/04-dot5-accepted.svg`+`.txt` | `TRANSACTION INSERTED SUCCESSFULLY` -- **on account `901123456`** (bank `001`, type `DD`), which had $0.00 withdrawn today, so the same $50.00 debit clears the ceiling check. NOT captured on v0/v1 (nothing else is deployed to re-run against); this is the "account under $5,000" option, not the "v0 program" option. |
| `screens/05-ais2-balances.svg`+`.txt` | the AIS2 `ACCOUNT BALANCES` screen for `101123456` that `getCheckingBalances.js` scrapes (service `65`, type `DD`) |

**Still not captured** -- see `FACTS.md`'s "What did NOT happen" section:
`ui/*` (VS Code + Claude Code extension screenshots -- section 8, needs a
real extension session), `manual/*` (hand-timed manual-path baseline --
explicitly not needed per the latest request, the demo uses the DOGECICS
estimate instead, labelled as such).
