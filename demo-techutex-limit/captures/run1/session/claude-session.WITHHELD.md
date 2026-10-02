# `claude-session.jsonl` is not in this repository

The capture archive includes a slice of the Claude Code session transcript
for this run (`MANIFEST.md` lists it as `session/claude-session.jsonl`). It
is withheld from this public copy: a raw transcript carries the session's
own instruction and memory attachments and the full prompt snapshot, which
describe systems and people that are not part of the demo.

What the demo takes from it is already here:

- `timings-from-transcript.jsonl` — the per-call timestamps derived from it;
- the five assistant lines quoted verbatim in
  `demo-atm-limit/app/src/demos/techutex/steps.ts`, each marked
  `// verbatim (session/claude-session.jsonl)`.

The full file is kept with the private archive of this run.
