# demo-atm-limit — the "daily limit" demo (PW-477)

A recorded, clickable demo of an AI coding assistant adding a daily
withdrawal limit to DOGECICS — a KICKS/CICS COBOL application on a TK5
(MVS 3.8) host — test-first, through Panelwright, inside VS Code. Design
record and the measured numbers: `docs/demo-atm-daily-limit.md`.

Three layers, from real to replayed:

- `atm/` — the "application": a small Doge ATM over `@panelwright/core`
  (`atm.ts` the client, `screen.ts` the driving helpers, `cli.ts` a one-shot
  CLI). `cobol/`, `bms/`, `jcl/` are the DOGECICS sources it talks to;
  `cobol/DOGESEND.cbl` is the version WITH the limit, `captures/run1/
  DOGESEND.v0.cbl` the original. `test/atm.regression.test.ts` (four
  characterization tests) and `test/atm.limit.test.ts` (four limit tests) are
  the suites the demo's agent wrote.
- `captures/` — everything the demo replays, all real: `run1/` is the
  measured agent loop (`timings.jsonl`, the three vitest transcripts, the
  COBOL versions and diffs, the job listings, `host-run1.txt`, the 3270
  screens as `renderSvg()` exports); `manual1/` the operator-path baseline
  measured by `scripts/manual-path.ts`.
- `app/` — the presentation: a static Vite/React app that looks like VS Code
  and replays `captures/` step by step. `cd app && npm install && npm run
  dev`; `npm run build` then `npx serve dist` runs it anywhere with no host.
  Keys: → / Space next, ← back, `S` step rail, click the pulsing widget.
  Behind a corporate npm registry with a 72-hour immaturity policy the
  install still works: `package.json`'s `overrides` pin Vite's daily-release
  transitive packages one release back (bump them together, or install with
  `--registry=https://registry.npmjs.org/`).
  The ATM is a data-driven skin (`app/src/story/atmSkins.ts`): `?atm=bank`
  (default) | `doge` | `terminal`, compared side by side on `bench.html`.

`AGENTS.md` (imported by `CLAUDE.md`) is what an AI assistant reads first:
the code map, the OS/VS COBOL constraints, the Panelwright commands for the
host and the test rules — the same notes a developer would keep.

## Running the real thing

Expects a healthy `tk5probe` container on `localhost:3271` (TN3270), user
HERC02/CUL8TR — override with `TK5_HOST`/`TK5_PORT`/`TK5_USER`/`TK5_PASS`.
Only one session may drive HERC02 at a time, and every run logs off to the
`Logon ===>` splash; a crashed driver strands the userid until
`npm run tk5:restart tk5probe`.

```sh
npx tsx demo-atm-limit/atm/cli.ts withdraw 50000     # REJECTED: DAILY LIMIT 10000 DOGE EXCEEDED
ATM_RECIPIENT="Someone Else" npx tsx demo-atm-limit/atm/cli.ts withdraw 1   # the default recipient is Petr Plavjanik
npx vitest run --root demo-atm-limit                  # the 8 live tests, ~26 s
npx tsx demo-atm-limit/scripts/manual-path.ts        # the operator-path measurement
```

`ATM_CAPTURE_DIR=<dir>` makes the ATM write an SVG + text render of each
screen it reaches. The tests are live only — never in CI (`examples/**` is
excluded from the root vitest config) — and each run spends about 1 105 DOGE
of the 10 000/day limit; `jcl/RESEED.jcl` restores the seed VSAM (balance 200,050.00 — upload it as
a NEW sequential data set, `transfer put "'HERC02.RESEED.JCL'" … --recfm f
--lrecl 80`, because an IND$FILE put cannot create a new PDS member here),
and `jcl/COMPSEND.jcl` compiles `DOGESEND` alone (`COMPCOBL.jcl` is the
application's full build).
