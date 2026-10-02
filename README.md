# Demos

Recorded, clickable presentation demos: a VS Code look-alike web page, no
backend, that replays a real run in which an AI coding agent adds a daily
withdrawal limit to a CICS/COBOL application test-first. The index of all demos is
<https://plavjanik.github.io/demos/>.

| Demo | Live | What it shows |
|---|---|---|
| **Techutex Banking** | <https://plavjanik.github.io/demos/techutex.html> | Claude Code with Endevor MCP, HostBridge JavaScript Engine (HB.js) MCP and Zowe MCP changing a CICS transaction on z/OS |
| **DOGECICS** | <https://plavjanik.github.io/demos/dogecics.html> | Claude Code with Panelwright driving a CICS application on MVS 3.8 (TK5) over a 3270 session |

## Layout

- `demo-atm-limit/app/` — the web app (Vite + React + TypeScript). One
  reusable kit (`src/kit/`), one module per demo (`src/demos/`), three entry
  pages (`index.html` the landing page, `dogecics.html`, `techutex.html`, `bench.html`).
- `demo-atm-limit/` — the DOGECICS demo's captured run, COBOL/JCL/BMS
  sources, and the ATM client and scripts that produced it. Those scripts
  were run inside a Panelwright checkout and are kept as the record of what
  ran; they do not build on their own here.
- `demo-techutex-limit/` — the Techutex demo's captured run (`captures/run1/`)
  and brand assets.
- `docs/demo-atm-daily-limit.md` — the design record: decisions, what is
  measured and what is staged, every review round.

## Build and run

```
cd demo-atm-limit/app
npm ci
npm run dev        # http://localhost:5173/ (index), /dogecics.html, /techutex.html
npm run build      # static bundle in dist/
```

Keys: `→`/Space next, `←` back, `S` step rail, `R` review mode, `B` hide the
presenter bar.

## Publishing

Every push to `main` builds the app and deploys `dist/` to GitHub Pages
(`.github/workflows/pages.yml`).

## What is real

Captured files under `captures/` are never edited. Anything the pages show
that differs from a capture goes through a named substitution table and is
labelled on the slide; staged or proposed tool calls carry a badge. The
design record lists each case.
