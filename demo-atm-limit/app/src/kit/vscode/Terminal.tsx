/**
 * The bottom panel's TERMINAL tab: a plain-text transcript replay. Started
 * as a real xterm.js instance, but xterm measures its own cell size through
 * the Stage's CSS `transform: scale()` (Stage.tsx) and got it wrong even
 * after chasing the measurement timing (glyphs horizontally condensed, rows
 * touching) — a DOM renderer under a non-1 ancestor scale is exactly the
 * case it doesn't handle. A plain `<pre>` per line has no cell-measurement
 * step at all: the browser lays it out like any other text, so it scales
 * with the rest of the stage the same way the editor's code does. The
 * captures themselves carry no ANSI colour (plain text, kept verbatim per
 * the brief) — this is the one place colour is added, from the transcript's
 * own markers (checkmarks, FAIL, +/-), the same way a real color-forcing
 * test runner would have painted it.
 */
import { useEffect, useRef, useState } from "react";
import { REPLAY_MS_PER_LINE } from "../engine/pacing";
import "./Terminal.css";

function lineClass(line: string): string {
  if (/^\s*✓/.test(line)) return "term-green";
  if (/^\s*×/.test(line)) return "term-red";
  if (/^\s*FAIL\b/.test(line)) return "term-red term-bold";
  if (/^\s*RUN\b/.test(line)) return "term-cyan";
  if (/AssertionError/.test(line)) return "term-red";
  if (/^-\s|^- /.test(line)) return "term-red";
  if (/^\+\s|^\+ /.test(line)) return "term-green";
  if (/^\s*(Test Files|Tests|Start at|Duration)\b/.test(line)) return "term-cyan term-bold";
  if (/^⎯+/.test(line)) return "term-dim";
  if (/^\s*❯/.test(line)) return "term-dim";
  // Plain hand-rolled test logs (Bash `node …test.js` output, not vitest's
  // own reporter) — a JSON body between the "$ " command echo and the
  // PASS/FAIL verdict stays plain, unhighlighted, on purpose (Part B.5).
  if (/^\s*PASS:/.test(line)) return "term-green";
  if (/^\s*FAIL:/.test(line)) return "term-red term-bold";
  if (/exit=1\b|\[exit 1\]/.test(line)) return "term-red";
  if (/^\$ /.test(line)) return "term-dim";
  return "";
}

export function TerminalPane({
  text,
  replay,
  instant,
}: {
  text: string;
  replay: boolean;
  instant: boolean;
}): React.JSX.Element {
  const lines = text.split("\n");
  const settled = instant || !replay;
  const [shown, setShown] = useState(settled ? lines.length : 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShown(settled ? lines.length : 0);
    if (settled) return;
    let cancelled = false;
    let i = 0;
    const step = () => {
      if (cancelled) return;
      i++;
      setShown(i);
      if (i < lines.length) timer = setTimeout(step, REPLAY_MS_PER_LINE);
    };
    let timer = setTimeout(step, REPLAY_MS_PER_LINE);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `lines` is a fresh array every render (text.split) — key off `text` itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, replay, settled]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  const replaying = !settled && shown < lines.length;

  return (
    <div ref={scrollRef} className="vsc-terminal-plain">
      <pre className="vsc-terminal-pre">
        {lines.slice(0, shown).map((line, i) => (
          <div key={i} className={`term-line ${lineClass(line)}`}>
            {line}
            {replaying && i === shown - 1 && <span className="term-cursor" aria-hidden="true" />}
          </div>
        ))}
      </pre>
    </div>
  );
}
