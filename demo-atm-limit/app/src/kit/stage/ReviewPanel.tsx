/**
 * Petr's review mode: a docked panel for the CURRENT step only — edit its
 * narration live (NarrationCallout.tsx picks the edit up immediately via
 * reviewData.ts's effectiveText), leave free-text feedback, and export
 * everything as Markdown. All of it lives in StepEngine's reviewData
 * (localStorage-backed) — nothing here talks to a server.
 *
 * Only ever rendered while reviewMode is on (App.tsx); nothing about it —
 * not even a collapsed/empty version — exists in the DOM otherwise, so
 * there's nothing for a normal presenter run to accidentally reveal.
 */
import { useState } from "react";
import { useStepEngine } from "../engine/StepEngine";
import { buildReviewMarkdown, isNarrationOverrideStale, reviewFieldValue } from "../engine/reviewData";
import "./ReviewPanel.css";

// Stable ids: NarrationCallout.tsx's review-mode pencil focuses these
// directly (document.getElementById), rather than the panel needing to
// expose an imperative handle for one button's sake.
export const REVIEW_NARRATION_FIELD_ID = "review-narration-field";
export const REVIEW_NARRATION_AFTER_FIELD_ID = "review-narration-after-field";

export function ReviewPanel(): React.JSX.Element {
  const {
    step,
    steps,
    reviewData,
    setReviewField,
    resetStepNarration,
    clearTextEdits,
    removeTextEdit,
    clearAllReviewData,
    cutId,
  } = useStepEngine();
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [showPreview, setShowPreview] = useState(false);

  // The textarea's own value: the stored override text even when it's
  // stale (reviewFieldValue), so Petr can still read what he wrote — unlike
  // effectiveText(), which is what the STAGE shows and refuses a stale one.
  const narration = reviewFieldValue(step, reviewData, "narration");
  const hasNarrationAfter = step.narrationAfter !== undefined;
  const narrationAfter = reviewFieldValue(step, reviewData, "narrationAfter");
  const feedback = reviewData[step.id]?.feedback ?? "";
  const narrationEdited = narration !== (step.narration ?? "");
  const narrationAfterEdited = hasNarrationAfter && narrationAfter !== (step.narrationAfter ?? "");
  const narrationStale = isNarrationOverrideStale(step, reviewData, "narration");
  const narrationAfterStale = isNarrationOverrideStale(step, reviewData, "narrationAfter");
  // TextEditOverlay.tsx's in-place edits for this step — see reviewData.ts's TextEdit.
  const textEdits = reviewData[step.id]?.textEdits ?? [];

  const markdown = buildReviewMarkdown(steps, reviewData, import.meta.env.VITE_BUILD, cutId);

  const copyReview = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus("copied");
    } catch {
      // Clipboard permission denied/unavailable (a sandboxed frame, an
      // automated browser with no clipboard grant) — fall back to the
      // legacy selection-based copy rather than silently doing nothing.
      try {
        const ta = document.createElement("textarea");
        ta.value = markdown;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyStatus("copied");
      } catch {
        setCopyStatus("failed");
      }
    }
    window.setTimeout(() => setCopyStatus("idle"), 1800);
  };

  const downloadReview = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "review.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (window.confirm("Clear every narration edit and feedback note? This cannot be undone.")) {
      clearAllReviewData();
    }
  };

  return (
    <aside className="review-panel" aria-label="Review mode">
      <div className="review-panel-header">
        <div className="review-panel-title">Review</div>
        <div className="review-panel-step">
          <span className="review-panel-step-id">{step.id}</span>
          <span className="review-panel-step-name">{step.title}</span>
        </div>
      </div>

      <div className="review-panel-body">
        <label className="review-field-label" htmlFor={REVIEW_NARRATION_FIELD_ID}>
          Narration
          {narrationStale && <span className="review-field-stale-tag">stale</span>}
        </label>
        <textarea
          id={REVIEW_NARRATION_FIELD_ID}
          className="review-field"
          rows={5}
          value={narration}
          placeholder="(no narration on this step — type to add one)"
          onChange={(e) => setReviewField(step.id, "narration", e.target.value)}
        />

        {hasNarrationAfter && (
          <>
            <label className="review-field-label" htmlFor={REVIEW_NARRATION_AFTER_FIELD_ID}>
              Narration (after)
              {narrationAfterStale && <span className="review-field-stale-tag">stale</span>}
            </label>
            <textarea
              id={REVIEW_NARRATION_AFTER_FIELD_ID}
              className="review-field"
              rows={5}
              value={narrationAfter}
              onChange={(e) => setReviewField(step.id, "narrationAfter", e.target.value)}
            />
          </>
        )}

        {(narrationEdited || narrationAfterEdited) && (
          <button type="button" className="review-reset-link" onClick={() => resetStepNarration(step.id)}>
            reset narration to the shipped text
          </button>
        )}

        {textEdits.length > 0 && (
          <>
            <label className="review-field-label">Text edits (click a leaf's pencil on stage to make one)</label>
            <ul className="review-text-edits">
              {textEdits.map((edit) => (
                <li key={edit.path} className={`review-text-edit ${edit.stale ? "review-text-edit-stale" : ""}`}>
                  <div className="review-text-edit-change">
                    <span className="review-text-edit-original">{edit.original || "*(empty)*"}</span>
                    <span aria-hidden="true"> → </span>
                    <span className="review-text-edit-edited">{edit.edited || "*(empty)*"}</span>
                    {edit.stale && <span className="review-text-edit-stale-tag">stale</span>}
                  </div>
                  <button
                    type="button"
                    className="review-text-edit-remove"
                    aria-label="Drop this text edit"
                    onClick={() => removeTextEdit(step.id, edit.path)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="review-reset-link" onClick={() => clearTextEdits(step.id)}>
              clear text edits
            </button>
          </>
        )}

        <label className="review-field-label" htmlFor="review-feedback-field">
          Feedback
        </label>
        <textarea
          id="review-feedback-field"
          className="review-field"
          rows={6}
          value={feedback}
          placeholder="Notes on this screen…"
          onChange={(e) => setReviewField(step.id, "feedback", e.target.value)}
        />

        <button type="button" className="review-preview-toggle" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "hide" : "preview"} review.md
        </button>
        {showPreview && <pre className="review-preview">{markdown}</pre>}
      </div>

      <div className="review-panel-footer">
        <button type="button" className="review-btn review-btn-primary" onClick={() => void copyReview()}>
          {copyStatus === "copied" ? "Copied ✓" : copyStatus === "failed" ? "Copy failed" : "Copy review"}
        </button>
        <button type="button" className="review-btn" onClick={downloadReview}>
          Download review.md
        </button>
        <button type="button" className="review-btn review-btn-danger" onClick={clearAll}>
          Clear all
        </button>
      </div>
    </aside>
  );
}
