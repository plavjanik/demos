# What is still needed for the Techutex Banking demo

The archive `cobol-cowboys-dot-daily-limit-2026-09-25` (now
`captures/run1/`) has everything the build needs for the code, the compile
rounds, the tests and the timings. Items 1 and 2 below ARRIVED (second pass,
2026-09-25 ~19:32-19:44 UTC) and are wired into the app: the chat script now
quotes 5 verbatim assistant lines from `session/claude-session.jsonl`
(everything else stays a marked narrative paraphrase), and the ATM's 3270
panel shows real `screens/*.svg` captures on both the before and after
steps. `session/timings-from-transcript.jsonl` was derived from the transcript's own
per-call stamps (real, monotonic, second-resolution; the original `timings.jsonl` is untouched) — see
`src/demos/techutex/agentLoopTiming.ts`'s header comment. Two things
remain.

## 1. Screenshots of the real extension (improves fidelity, does not block)

Section 8 of `COLLECTING.md`, from a VS Code with the Claude Code
extension, the Endevor MCP and, if available, Explorer for Endevor and the
HB.js extension: an MCP tool row expanded (how `code4z-cowboys` ›
`get_element_content` is rendered), a permission prompt for an MCP call, a
permission prompt for a Bash/`hb` call, the Explorer for Endevor tree with
`DEV/1/BANKING/DOT`, the HB.js view. Full window, PNG.

## 2. `session/environment.txt` — DELIVERED

Arrived with the second pass; used for the model pill and version citations.

## Not needed

- A manual-path timing: the demo adapts the DOGECICS manual model to the
  Endevor path, labelled as estimates. Real timings are welcome any time.
- More test runs, listings or source versions: the four runs and three
  listings are the story.

## Provenance notes

- `captures/run1/code/AGENTS.md` is the demo's own text, written for this
  app — the real archive's Endevor inventory has no `AGENTS.md`/`MD`-type
  element at all. It's prerendered and shown on screen like any other real
  captured source file, but it was never retrieved from a live server.
- `captures/run1/screens/02-dot5-filled.svg`, `03-dot5-rejected.svg` and
  `04-dot5-accepted.svg` are shown in the app with the AMOUNT 1 and ACCOUNT
  KEY field text substituted to the demo's own values (a $200,000.00 debit
  on the demo account, not the real run's $50.00) — the substitution is
  applied to the SVG string at build time in `app/scripts/prerender.mts`'s
  `DOT5_SCREEN_SUBSTITUTIONS` table, never written back to these files.
- The lab system's host name, userid, dataset prefix and CICS region are
  replaced with generic names in the capture files of this public copy,
  and the session transcript is withheld — both recorded in
  `captures/run1/REDACTIONS.md`.
