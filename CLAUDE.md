# Demos — instructions for Claude

Two recorded presentation demos share one web app. `README.md` has the
layout and the commands; `docs/demo-atm-daily-limit.md` is the design record
(decisions, measured vs staged, every review round). `demo-atm-limit/app/README.md`
documents the app itself (kit vs demos, review mode, spoken narration).

History before 2026-10-02 lives in the private Panelwright repository
(`examples/demo-atm-limit`, `examples/demo-techutex-limit`, commits
5c9811ae..19679f46). This repository starts from that tree with the
`examples/` prefix removed.

## Commands (run in `demo-atm-limit/app`)

- `npm ci`, `npm run dev` (prerender + Vite), `npm run build` (prerender,
  `tsc --noEmit`, Vite build), `npx vitest run`, `npx prettier --check src scripts`.
- Entry pages: `index.html` (landing page listing the demos, `src/landing/`), `dogecics.html`, `techutex.html`, `bench.html`; a new demo needs a card on the landing page.
- `#step-<id>` in the URL addresses a step; `?review` opens review mode;
  `?name=`, `?voice=`, `?tts=` are one-shot presenter overrides.
- Publishing is a push to `main`: the Pages workflow builds, runs the tests,
  checks that every bundle an entry page references exists, and deploys.
  There is no pages branch and no hand-copied `dist/`.

## Rules that are not negotiable

- **Nothing unmeasured on a slide.** A number is shown only if a capture
  measured it; an estimate says "estimate" (`CompareData.mechanicsBasis`,
  the manual model's `basis` strings).
- **Captures are never edited** (`demo-*/captures/**`). A derived view is a
  named, commented substitution table that throws when its needle is
  missing: `DOT5_SCREEN_SUBSTITUTIONS` in `scripts/prerender.mts`. The
  one exception is `demo-techutex-limit/captures/run1/code/AGENTS.md`, which
  is the demo's own text.
- **This repository is public.** Before adding a capture, scan it
  (`gitleaks detect --no-git --source .`) and read its `REDACTIONS.md`: a
  redaction record must not name the secret it searched for. Never add a
  raw agent session transcript: it embeds that session's instruction and
  memory files. Host names, userids, dataset prefixes and region names of
  the system a run was captured on are replaced with generic names before
  the capture is committed; `src/demos/publicCopy.test.ts` fails the build
  when one slips through.
- **Staged and proposed are labelled**: `badge: "staged" | "proposed"` on
  the chat row, and the step caption says what was staged.
- **`src/kit/**` never imports `src/demos/**` or `src/generated/**`**
  (`src/kit/kit-boundary.test.ts`).
- Every assistant line in a `steps.ts` carries `// verbatim (...)` or
  `// narrative: ...`; the owner's narration is verbatim with only listed
  typo fixes.

## Folding a review round

The owner reviews the published page in review mode and sends `review.md`.
Apply his narration verbatim, fix only clear typos and list them in the
comment. A narration whose "after" is an older version of the current text
is a stale echo from browser storage, not a new edit. Look at the result at
1280×720 and 1920×1080 before pushing; layout bugs here have only ever been
caught by looking.

## Dependencies

The owner's corporate registry refuses packages younger than 72 hours. Before
adding or updating a dependency, check `npm view <pkg>@<version> time` for
the package and its new transitives, and pin through `overrides` in
`demo-atm-limit/app/package.json` when one is too young.
