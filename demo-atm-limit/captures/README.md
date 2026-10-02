# captures — what the demo replays

Everything here is real output of a run against `tk5probe`; nothing is
hand-written. `run1/` is the measured agent loop of 2026-09-24
(`timings.jsonl` is the clock), `manual1/` the operator-path baseline.
Logs are `.txt` on purpose: the root `.gitignore` drops `*.log`, and the
app's prerender reads these.

| File | What it is | Used by |
|---|---|---|
| `run1/prompt.md`, `plan.md`, `search-grep.txt` | the ticket, the assistant's plan, the grep that found `MOVE-SOME-DOGE` | `ticket`, `plan`, `read-dogesend` |
| `run1/DOGESEND.v0/v1/v2.cbl`, `*.diff` | the program before, after the first edit (UNSTRING/INSPECT), after the rewrite | `read-dogesend`, `diff-v0-v1`, `diff-v1-v2` |
| `run1/vitest-1-regression.ansi`, `vitest-2-limit-red.ansi`, `vitest-3-after-v2.ansi` | the three test runs of the loop, re-taken 2026-09-25 after the suite was split into `test/atm.regression.test.ts` + `test/atm.limit.test.ts` (same tests, same outcomes: 4 green; 6 green + 2 red; 8 green) — the measured originals ran as one file `test/atm.test.ts`; the working-directory path on their `RUN` line is rewritten to `/work/demo-atm-limit` (the only edited byte in any capture) | `warmup-run`, `limit-tests-red`, `green` |
| `run1/host-run1.txt` | every CLI command of the loop and its output | `upload-approval`, `compile-v1-fails`, `diff-v1-v2` |
| `run1/job-rc12-rerun-JOB00039.outlist` | the RC 12 listing, recompiled from the identical v1 source after the measured run's copy was lost | `compile-v1-fails` |
| `run1/job-JOB00038.outlist` | the RC 4 / LKED 0 compile of v2, as measured | `diff-v1-v2` |
| `run1/atm-before-50000/`, `atm-after-50000/` | `renderSvg()` + text of each 3270 screen, before (v0) and after (v2) the change — re-taken 2026-09-25 after the host was re-seeded to a 200,050.00 balance (`jcl/RESEED.jcl`) and the recipient became `Petr Plavjanik` | `before-accepted`, `after-refused` |
| `run1/atm-before-50000.txt`, `atm-after-50000.txt`, `atm-after-0.5.txt` | the ATM CLI's own output for those runs (same re-take) | `before-accepted`, `after-refused` |
| `run1/host-recapture.txt` | the CLI commands of the 2026-09-25 recapture (listing rerun, before-screens, v2 restored) | — |
| `manual1/mechanics.jsonl` | the measured operator mechanics behind the manual bars | `app/src/story/manualTimings.ts` |
| `manual1/README.md` | why the full operator-path driver never completed, and what it measured about REVEDIT | design record §5 |

To record the same kind of material on another machine (another host, another CICS application, Endevor + HB.js instead of a local workspace + Panelwright), follow `../COLLECTING.md`.
