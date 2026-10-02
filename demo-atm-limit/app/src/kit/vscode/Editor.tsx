/**
 * The editor tab strip + the pre-rendered code (or diff) pane. Highlighting
 * happens at whatever demo's own build time (its own prerender step) —
 * this just drops the HTML `useContent().code` already carries in, then
 * (generic, any step can use it) scrolls to and highlights a line range
 * via the `[data-line]` attribute that build step is expected to stamp on
 * every line. `openFile` omitted renders VS Code's "no editor open" empty
 * state (a warm-up step with an empty chat can start here too).
 */
import { useEffect, useRef } from "react";
import { useContent } from "../engine/content";
import type { Diagnostic } from "../engine/types";
import "./Editor.css";

function basename(p: string): string {
  return p.split("/").pop() ?? p;
}

export function Editor({
  openFile,
  diffOf,
  scrollToLine,
  highlightLines,
  diagnostics,
}: {
  openFile?: string;
  diffOf?: [string, string];
  scrollToLine?: number;
  highlightLines?: Array<[number, number]>;
  /** Staged compiler/editor diagnostics — see types.ts's Diagnostic for why "staged", not live. */
  diagnostics?: Diagnostic[];
}): React.JSX.Element {
  const { code, codePaths } = useContent();
  const entry = openFile ? code[openFile] : undefined;
  const path = openFile ? (codePaths[openFile] ?? openFile) : undefined;
  const tabLabel = diffOf ? `${basename(diffOf[0])} ↔ ${basename(diffOf[1])}` : path ? basename(path) : undefined;
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    for (const el of root.querySelectorAll(".line-highlight")) el.classList.remove("line-highlight");
    if (highlightLines) {
      for (const [start, end] of highlightLines) {
        for (let n = start; n <= end; n++) {
          root.querySelector(`[data-line="${n}"]`)?.classList.add("line-highlight");
        }
      }
    }
    for (const el of root.querySelectorAll(".diag-error, .diag-warning")) {
      el.classList.remove("diag-error", "diag-warning");
      el.removeAttribute("title");
    }
    for (const d of diagnostics ?? []) {
      const row = root.querySelector(`[data-line="${d.line}"]`);
      if (!row) continue;
      row.classList.add(d.severity === "error" ? "diag-error" : "diag-warning");
      row.setAttribute("title", `${d.message} [${d.source}${d.code ? ` ${d.code}` : ""}]`);
    }
    const target = scrollToLine ?? highlightLines?.[0]?.[0] ?? diagnostics?.[0]?.line;
    if (target !== undefined) {
      root.querySelector(`[data-line="${target}"]`)?.scrollIntoView({ block: "center" });
    } else {
      root.scrollTop = 0;
    }
    // openFile identifies the entry; scrollToLine/highlightLines/diagnostics
    // are plain values, so this effect only needs to rerun when any changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFile, scrollToLine, JSON.stringify(highlightLines), JSON.stringify(diagnostics)]);

  if (!openFile) {
    return (
      <div className="vsc-editor">
        <div className="vsc-tabstrip" />
        <div className="vsc-editor-body vsc-editor-empty">
          <span className="codicon codicon-code" aria-hidden="true" />
          <div>No editor open</div>
        </div>
      </div>
    );
  }

  return (
    <div className="vsc-editor">
      <div className="vsc-tabstrip">
        <div className="vsc-tab active">
          <span className="codicon codicon-file" />
          <span>{tabLabel}</span>
        </div>
      </div>
      <div className="vsc-editor-body" ref={bodyRef}>
        {entry ? (
          <div className="code-block" dangerouslySetInnerHTML={{ __html: entry.html }} />
        ) : (
          <div className="vsc-editor-missing">no generated code for &quot;{openFile}&quot;</div>
        )}
      </div>
    </div>
  );
}
