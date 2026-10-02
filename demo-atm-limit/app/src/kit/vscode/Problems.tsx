/**
 * The bottom panel's PROBLEMS tab: one row per staged Diagnostic (types.ts)
 * — error icon, message, "source(code)" in muted text, "[Ln N, Col 8]".
 * Column is always 8 (Area A's own first column, cols8-72) — nothing in a
 * staged diagnostic carries a real column, and every one of this kit's own
 * diagnostics so far is an Area-A/column-7 violation anyway.
 */
import type { Diagnostic } from "../engine/types";
import "./Problems.css";

export function ProblemsPanel({ diagnostics }: { diagnostics: Diagnostic[] }): React.JSX.Element {
  return (
    <div className="vsc-problems">
      {diagnostics.map((d, i) => (
        <div key={i} className={`prob-row prob-${d.severity}`}>
          <span className={`codicon ${d.severity === "error" ? "codicon-error" : "codicon-warning"}`} />
          <span className="prob-message">{d.message}</span>
          <span className="prob-source">
            {d.source}
            {d.code ? `(${d.code})` : ""}
          </span>
          <span className="prob-loc">[Ln {d.line}, Col 8]</span>
        </div>
      ))}
    </div>
  );
}
