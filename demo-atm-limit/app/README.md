# demo-atm-limit/app

Two pre-recorded, click-through presentations of Claude Code driving a real
change on a real mainframe application, built from one shared presentation
kit:

- **DOGECICS** (`dogecics.html`) — a daily withdrawal limit in DOGECICS, a
  small CICS application running under KICKS on an MVS 3.8 host, recreated
  as a Doge ATM + VS Code + Claude Code window + data diagrams.
- **Techutex Banking** (`techutex.html`) — a daily debit ceiling in DOT500
  (`cobol-cowboys`'s `ais-cam-dot` demo apps), live on CICS TS, driven via
  an Endevor MCP server and HB.js — recreated as a bank ATM + an "Explorer
  For Endevor" VS Code window + the same diagram scenes.

Both are: no live host, no live model, just a real captured agent run
replayed at presentation pace (Vite + React + `motion`).

## Layers

```
src/
  kit/         reusable presentation kit — generic, knows nothing about
               either demo
  demos/
    dogecics/  DOGECICS's own data: STEPS + CONTENT
    techutex/  Techutex Banking's own data: STEPS + CONTENT
  DemoApp.tsx  wires a demo (steps + content) -> kit
  main.tsx           mounts demos/dogecics at dogecics.html
  landing/           index.html's landing page (static, links every demo)
  main-techutex.tsx  mounts demos/techutex at techutex.html
```

**`src/kit/**` may import React, third-party libraries, and other
`src/kit/**` files — nothing else.** It never imports `src/demos/<name>/**`
or `src/generated/<name>/**` (the build-time-generated code/screen
captures, one subdirectory per demo). That rule is pinned by a test,
`src/kit/kit-boundary.test.ts`: it walks every file under `src/kit` with
`fs`, greps every `import`/`from` specifier, and fails if one resolves
outside `src/kit`. Run it on its own with
`npx vitest run src/kit/kit-boundary.test.ts` — flip an import to point at
`../../demos/dogecics/...` and watch it fail, then revert.

`src/demos/<name>/**` is free to import both `src/kit/**` and
`src/generated/<name>/**`; `DemoApp.tsx` and `bench.tsx` are the only other
files that import `src/generated/**` directly (bench.tsx does not — it
drives `AtmMachine` with explicit props).

### The kit's public surface

`src/kit/index.ts` re-exports everything a demo needs:

- **engine** — `StepEngineProvider`/`useStepEngine` (the presenter's state
  machine: which step, keyboard nav, the review-mode data — `demoId` prefixes
  its localStorage keys so two demos in one browser profile never share
  review notes), `ContentProvider`/`useContent` (the content seam, see
  below), the `Step`/`ChatItem`/`Diagnostic`/`ProcessDiagram`/... data
  types, `reviewData.ts`'s read/write/export helpers, `duration.ts`'s clock
  formatting, `pacing.ts`'s replay-speed constant.
- **stage** — `Stage` (scales a 1920×1080 design to fit any viewport),
  `Hotspot` (click-to-advance), `NarrationCallout` (the presenter's spoken-
  cue callout, with generic collision avoidance against any
  `data-keep-clear` element), `PresenterBar`, `StepRail`, `TimerHud`,
  `ReviewPanel`.
- **vscode** — a pixel-faithful VS Code Dark Modern shell (`VSCodeScene` and
  its pieces: `TitleBar`, `ActivityBar` — an optional `activityBarExtra`
  codicon for an extension's own view, e.g. Explorer For Endevor —
  `Explorer` — a plain single-section tree, or N collapsible
  `explorerSections` for an extension's own side bar — `Editor` — code,
  diff, or staged `diagnostics` (squiggle + gutter marker + PROBLEMS panel),
  `TerminalPane`, `Problems`, `ChatPanel` — a Claude Code chat side bar
  whose tool rows can carry an `mcp: {server, tool}` badge and a
  `proposed: true` "not shipped yet" tag — `StatusBar`) driven by
  `Step.vscode` plus `useContent()`.
- **atm** — `AtmScene`/`AtmMachine`, three skins (`ATM_SKINS`: doge/bank/
  terminal — pick one with `?atm=`), a `content.atm.brand.logoUrl` /
  `Step.titleScene.logoUrl` slot, `content.atm.recipientLabel` to relabel
  the second screen line, and `toResponsiveSvg` for a captured 3270-style
  screen (with an optional `AtmStep.screenNote` caption under it).
- **diagrams** — `ComponentsStrip` (a small architecture strip, boxes from
  `content.components`), `ProcessScene` (two side-by-side process
  diagrams), `CompareScene` (a measured-vs-manual bar chart, data from
  `content.compare`).
- **title** — `TitleScene`, reading `Step.titleScene`.

### The content seam

`kit/engine/content.tsx`'s `PresentationContent` is the typed bag every kit
scene reads through `useContent()` instead of importing generated data or a
demo's own config: prerendered source code + paths, the Explorer tree (or
`explorerSections`), terminal transcripts, captured screens, the
architecture-strip boxes, the ATM's balance/recipient/currency/brand, the
compare step's numbers, and the workspace name. Each demo's own
`content.ts` assembles its `CONTENT` from its own `src/generated/<name>/*`
(built by `scripts/prerender.mts`) and its own directory's facts
(`workspace.ts`, `components.ts`, `config.ts`, `compare.ts`).

## Build / run / publish

```sh
npm install
npm run build     # prerender + tsc --noEmit + vite build -> dist/, then build:offline
npm run build:offline  # (part of build) one self-contained dist/offline/<page>-offline.html per demo
npx serve -l 5000 dist   # serve the built dist/ locally
```

`npm run build:offline` (`scripts/build-offline.mts`, run at the end of `npm run build`) rebuilds
`techutex`, `techutex-variants` and `dogecics` one page at a time into `dist-offline/` (gitignored) and
writes `dist/offline/<page>-offline.html`: ONE file with every script, stylesheet, font (the `public/fonts`
woff2s and the codicon ttf) and image inlined, which opens from disk with no network. It fails the build
if a non-`data:` `url(` or an unlisted `http(s)` URL survives. The landing page links these as
"Download for offline use". Opened from `file://`, the cut chooser keeps the cut in memory because
`history.replaceState` may be refused there.

`npm run dev` runs the same prerender step then starts Vite's dev server
(HMR; every `.html` entry is served by path — `/`, `/techutex.html`,
`/bench.html`). `npm test` (`npx vitest run src/`) runs the unit tests,
including `kit-boundary.test.ts` and `manualTimings.test.ts`.

### Keys and query params

- `→` / `Space` — next step; `←` — previous; `Home` — first step.
- `S` — toggle the step rail (click a row to jump straight to it; the URL
  hash `#step-<id>` deep-links to any step directly).
- `R` — toggle review mode (a docked panel for live narration edits +
  free-text feedback per step, exported as Markdown — nothing here talks
  to a server; `?review` forces it on for one load).
- `?instant` — skips every reveal/stagger animation (for a fast pass or a
  screenshot script).
- `?atm=bank|doge|terminal` — picks the ATM skin for this session
  (remembered in `localStorage` after); `bench.html` shows all three side
  by side, accepted and refused, for a visual decision at a glance.
- `?cut=<id>` — a demo with several cuts (`DemoApp`'s `cuts` prop;
  `techutex-variants.html` has `full`, `medium`, `short` from
  `src/demos/techutex/cuts.ts`, while `techutex.html` passes none) opens on a
  chooser (`1`/`2`/`3`) unless the URL names a cut or carries an old
  `#step-…` deep link, which means the first cut. A cut is a selection of
  the Full step objects plus merged steps whose narration only concatenates
  the owner's existing paragraphs (`cuts.test.ts` pins this); the presenter
  bar shows the cut and returns to the chooser, and `review.md` carries a
  `Cut:` line. The Full cut keeps the demo's own localStorage prefix; the
  others get `<demoId>-<cut>`.

## How to make another demo from the kit

The kit (`src/kit/**`) has no idea what DOGECICS, Techutex, or a Doge ATM
are — it only knows about a step engine, a stage, some VS Code chrome, an
"ATM" shape, and a couple of diagram scenes. A different demo of Claude
Code driving a different application or tool is a new sibling of
`src/demos/**`:

1. Write your own `src/demos/<name>/steps.ts` — an array of `Step`
   (kit/engine/types.ts): pick `scene` per step (`"title" | "atm" |
   "vscode" | "process" | "compare"`), fill in whichever of
   `atm`/`vscode`/`process` that scene needs, and give every VS Code step's
   `chat` a real (or dramatized, marked as such) transcript.
2. Write your own `src/demos/<name>/content.ts` assembling a
   `PresentationContent`. For prerendered code/screens, add your demo to
   `scripts/prerender.mts`'s `DEMOS` array (a `DemoSources`-shaped entry:
   its `exRoot`, its own `CODE_FILES` list, and a `buildCaptures()` function
   for whatever your demo's own captures shape needs — the shiki/theme/
   grammar setup and the code.ts pipeline are already shared, only the
   captures.ts shape is demo-specific) — this writes
   `src/generated/<name>/{code,captures}.ts`. Then your own Explorer tree
   (or sections), architecture boxes, ATM facts
   (balance/recipient/currency/brand) if you use the `"atm"` scene, and
   your own compare numbers if you use `"compare"`.
3. Add `src/demos/<name>/index.ts` re-exporting `STEPS`/`CONTENT`, a
   `<name>.html` entry (copy `techutex.html`) pointing at a new
   `src/main-<name>.tsx` (copy `main-techutex.tsx`: `<DemoApp steps={STEPS}
   content={CONTENT} demoId="<name>" narrationId="<name>" />` — `demoId`
   keeps this demo's review localStorage separate from every other demo;
   `narrationId` names its `public/narration/<name>/` folder and its own
   spoken-narration settings, see "Spoken narration" below), and list the
   new HTML entry in `vite.config.ts`'s `rollupOptions.input`.

Nothing in `src/kit/**` needs editing to do this — that's the whole point
of the split.

## Spoken narration

Every step's `narration`/`narrationAfter` callout (`Step`, kit/engine/
types.ts) can be spoken aloud instead of only read — a speaker button on the
callout itself, plus autoplay. Settings live in the status bar's "🔊 voice"
popover (kit/vscode/VoicePopover.tsx) and persist per demo in localStorage
(kit/engine/narrationSettings.ts); `V` toggles play/stop of whatever
narration is currently on screen (mirrors `S`/`R`'s "not while typing"
guard).

**Modes** (`Off` / `Rendered` / `Live`):

- **Live** POSTs the narration's plain-speech text (Markdown stripped down
  by kit/engine/speechText.ts — bold/code/list markers gone, paragraph
  breaks turned into pauses) to a local TTS server on each play, caches the
  result (in-memory + IndexedDB, keyed by voice+text) so replaying a step
  never re-fetches, and prefetches the next few steps' narration in the
  background while autoplay is on. Two request shapes: `xtts` (a cloned-
  voice XTTS-v2 server, default `http://localhost:8085`) — **slow,
  measured ~20s for one sentence on this machine**, hence the prefetch/cache
  and a concurrency-1 queue so a click is never stuck behind two background
  prefetches — and `openai` (an OpenAI-`/v1/audio/speech`-shaped fast
  fallback such as mlx-audio's Kokoro, default port 8000; unverified on this
  machine — see the "What didn't work" note below).
- **Rendered** plays a pre-baked mp3 from `public/narration/<name>/
  manifest.json` (below), falling back to a live fetch when the manifest
  has no entry for a step, or its recorded text hash no longer matches the
  current text (narration was edited since the last render).
- A quick-start URL sets it for one load without touching localStorage:
  `?tts=http://host:8085&voice=tata&narration=live`.

**Important limitation**: both TTS servers are plain `http://`. The
published site is `https://` (GitHub Pages), and a browser blocks an https
page from fetching an http URL (mixed content) — so **live mode only works
with the app served locally** (`npm run dev`, or `npx serve dist`) or
reached over Tailscale's own http. **Rendered mode is what works
everywhere**, including the published site, since it's just static mp3
files shipped with the build.

### Rendering narration to mp3

```sh
npm run prerender                      # steps.ts imports generated captures — see below
npm run narration:render:techutex      # or narration:render:dogecics
# equivalently: npx tsx scripts/render-narration.mts --demo techutex --voice tata \
#   --tts http://localhost:8085 --shape xtts [--only stepId,stepId] [--force]
```

Loads the demo's `STEPS` through Vite's own SSR module loader (not a plain
Node import — Techutex's `config.ts` imports a brand logo PNG, a normal
Vite asset import a bare `tsx` import can't resolve), computes each step's
speech text the same way the kit does at runtime (shared function,
kit/engine/speechText.ts), POSTs it to the TTS server, converts the
response to a normalized mono 24kHz mp3 with `ffmpeg`, and writes
`public/narration/<demo>/<stepId>.mp3` (or `<stepId>.after.mp3` for
`narrationAfter`) plus that folder's `manifest.json` (`{stepId, phase,
file, textHash, durationMs}` per entry — `textHash` is what "rendered"
playback checks a step's current text against). Skips a step whose text
hash already matches its manifest entry unless `--force`; prints how long
each render actually took.

`public/narration/` is gitignored for now (only `.gitkeep` is tracked) —
**XTTS-v2's model weights are licensed under Coqui's CPML, non-commercial
use only**, so shipping a cloned-voice mp3 publicly is a decision for the
owner to make deliberately, not a side effect of running this script.

**What didn't work (2026-09-26 measurement):** the `openai`-shaped fast
fallback (mlx-audio's Kokoro server, `:8000`) accepted requests
(`/health`/`/` responded fine) but never returned from `/v1/audio/speech`
even for a two-word input — three attempts, up to a 240s timeout, zero
bytes back each time. The client code follows its own `/openapi.json`
schema (`model`/`input`/`voice`/`speed`, default `response_format: "mp3"`)
and is otherwise untested; XTTS (`:8085`) is the one actually exercised
end-to-end below.
