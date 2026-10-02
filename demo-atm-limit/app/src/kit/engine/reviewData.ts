/**
 * Review mode's own data (StepEngine.tsx wires the read/write into its
 * context): per-step narration edits and free-text feedback, all keyed by
 * step id and persisted to localStorage — nothing here reaches a server,
 * it's Petr's own browser. Kept as a separate module (rather than folded
 * directly into StepEngine.tsx's body) because it also owns the Markdown
 * export ReviewPanel.tsx's "Copy review"/"Download review.md" call.
 */
import type { Step } from "./types";

/**
 * One in-place text edit made through TextEditOverlay.tsx — `path` is a
 * stable locator from the stage root (textEditPath.ts's buildTextEditPath),
 * `original` the text captured the moment editing STARTED (the shipped
 * text, or a prior edit's own `original` if this is a second round on the
 * same leaf — never the currently-displayed edited text, or "original"
 * would drift forward on every re-edit). `stale` is set by the overlay's
 * own re-apply pass (its MutationObserver) the moment it finds this path's
 * current live text is neither `original` nor `edited` — the underlying
 * content genuinely changed and this edit can no longer be trusted to
 * still apply to the same thing; left alone rather than reapplied, and
 * flagged in the export so Petr knows to re-make it by hand.
 */
export interface TextEdit {
  stepId: string;
  path: string;
  original: string;
  edited: string;
  stale?: boolean;
}

export interface ReviewEntry {
  /** Override for Step.narration — "" is a valid, deliberate override (cleared to hide the callout), so its presence as a KEY (not its truthiness) is what marks it "edited". */
  narration?: string;
  /** Override for Step.narrationAfter — same "" rule as narration. */
  narrationAfter?: string;
  /**
   * The shipped `Step.narration` text `narration` was typed against —
   * recorded the FIRST time this step's narration is edited (StepEngine's
   * setReviewField) and never overwritten by a later re-edit, same
   * "original never drifts forward" rule as TextEdit.original. Missing on
   * an override written before this field existed (a legacy override) —
   * effectiveText() treats that the same as a mismatch: stale.
   */
  narrationOriginal?: string;
  /** Same as `narrationOriginal`, for `narrationAfter`. */
  narrationAfterOriginal?: string;
  /** Free-text notes on this screen, unrelated to the narration text itself. */
  feedback?: string;
  /** This step's in-place text edits (TextEditOverlay.tsx) — see TextEdit. */
  textEdits?: TextEdit[];
}

export type ReviewData = Record<string, ReviewEntry>;

const REVIEW_DATA_KEY = "demo-review-data";

/**
 * DOGECICS keeps `keyPrefix` empty so its localStorage key is the literal
 * string it always was (Petr's existing review notes stay readable); a
 * second demo in the same browser profile passes its own `demoId`
 * (StepEngineProvider) so the two demos' notes never share one JSON blob —
 * sharing one would make either demo's "clear all"/export mix the other's
 * notes in.
 */
export function readReviewData(keyPrefix = ""): ReviewData {
  try {
    const raw = window.localStorage.getItem(keyPrefix + REVIEW_DATA_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ReviewData) : {};
  } catch {
    // private window / storage blocked / corrupt JSON — start clean rather
    // than throw, this is presenter-side convenience data, not the story.
    return {};
  }
}

export function writeReviewData(data: ReviewData, keyPrefix = ""): void {
  try {
    window.localStorage.setItem(keyPrefix + REVIEW_DATA_KEY, JSON.stringify(data));
  } catch {
    // ignore — nothing to persist it in this session
  }
}

function narrationOriginalField(field: "narration" | "narrationAfter"): "narrationOriginal" | "narrationAfterOriginal" {
  return field === "narration" ? "narrationOriginal" : "narrationAfterOriginal";
}

/**
 * Whether this step's narration/narrationAfter override no longer applies:
 * the shipped text moved on since the override was typed, so the override
 * was typed against text that no longer exists. True for an override with
 * NO recorded original too (a legacy override, stored before
 * narrationOriginal/narrationAfterOriginal existed) — there's nothing to
 * compare, so it's treated the same as a mismatch. False when there's no
 * override at all — "stale" only means something for an override that
 * exists.
 */
export function isNarrationOverrideStale(step: Step, data: ReviewData, field: "narration" | "narrationAfter"): boolean {
  const entry = data[step.id];
  if (!entry || !(field in entry)) return false;
  const original = entry[narrationOriginalField(field)];
  if (original === undefined) return true;
  return original !== (step[field] ?? "");
}

/** The effective narration/narrationAfter text for a step: the review override if one was ever typed (including an explicit "") AND it isn't stale, else the shipped text. */
export function effectiveText(step: Step, data: ReviewData, field: "narration" | "narrationAfter"): string | undefined {
  const entry = data[step.id];
  if (entry && field in entry && !isNarrationOverrideStale(step, data, field)) return entry[field];
  return step[field];
}

/**
 * The review panel textarea's own value: the stored override text
 * regardless of staleness (so Petr can still read what he typed), falling
 * back to the shipped text only when there's no override at all. Distinct
 * from `effectiveText()`, which is what the STAGE shows and refuses a stale
 * override.
 */
export function reviewFieldValue(step: Step, data: ReviewData, field: "narration" | "narrationAfter"): string {
  const entry = data[step.id];
  if (entry && field in entry) return entry[field] ?? "";
  return step[field] ?? "";
}

function escapeForMarkdown(s: string): string {
  // Fence-breaking backticks are the only real hazard in free text destined
  // for a Markdown code fence/quote below.
  return s.replace(/`/g, "`​");
}

/**
 * One section per step that has SOMETHING to say (feedback text, a
 * narration/narrationAfter override that actually differs from the shipped
 * text, or one or more in-place text edits — TextEditOverlay.tsx) — story
 * order, skipping every step with none of these, so the document is a
 * punch list Petr can act on rather than 18 mostly-empty headers.
 */
export function buildReviewMarkdown(steps: Step[], data: ReviewData, buildId: string): string {
  const lines: string[] = [];
  lines.push("# Demo review notes");
  lines.push("");
  lines.push(`Build: \`${buildId}\``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  let sections = 0;
  for (const step of steps) {
    const entry = data[step.id];
    const feedback = entry?.feedback?.trim();
    const narrationChanged = entry && "narration" in entry && entry.narration !== (step.narration ?? "");
    const narrationAfterChanged =
      entry && "narrationAfter" in entry && entry.narrationAfter !== (step.narrationAfter ?? "");
    const textEdits = entry?.textEdits ?? [];

    if (!feedback && !narrationChanged && !narrationAfterChanged && textEdits.length === 0) continue;
    sections++;

    lines.push(`## ${step.id} — ${step.title}`);
    lines.push("");
    if (feedback) {
      lines.push("**Feedback:**");
      lines.push("");
      lines.push(escapeForMarkdown(feedback));
      lines.push("");
    }
    if (narrationChanged) {
      const staleTag = isNarrationOverrideStale(step, data, "narration")
        ? " *(stale — the shipped narration changed since this edit; re-check by hand)*"
        : "";
      lines.push("**Narration:**");
      lines.push(`- before: ${step.narration ? escapeForMarkdown(step.narration) : "*(none)*"}`);
      lines.push(`- after: ${entry!.narration ? escapeForMarkdown(entry!.narration) : "*(cleared)*"}${staleTag}`);
      lines.push("");
    }
    if (narrationAfterChanged) {
      const staleTag = isNarrationOverrideStale(step, data, "narrationAfter")
        ? " *(stale — the shipped narration changed since this edit; re-check by hand)*"
        : "";
      lines.push("**Narration (after):**");
      lines.push(`- before: ${step.narrationAfter ? escapeForMarkdown(step.narrationAfter) : "*(none)*"}`);
      lines.push(
        `- after: ${entry!.narrationAfter ? escapeForMarkdown(entry!.narrationAfter) : "*(cleared)*"}${staleTag}`,
      );
      lines.push("");
    }
    if (textEdits.length > 0) {
      lines.push("**Text edits:**");
      lines.push("");
      for (const edit of textEdits) {
        const staleTag = edit.stale ? " *(stale — re-check by hand)*" : "";
        lines.push(
          `- \`${edit.path}\`: "${escapeForMarkdown(edit.original)}" → "${escapeForMarkdown(edit.edited)}"${staleTag}`,
        );
      }
      lines.push("");
    }
  }

  if (sections === 0) {
    lines.push("*(No feedback or narration edits yet.)*");
    lines.push("");
  }

  return lines.join("\n");
}
