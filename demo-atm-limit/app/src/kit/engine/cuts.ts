/**
 * A "cut" is one named selection and ordering of a demo's steps (Full /
 * Medium / Short), all built from the SAME step data. The chooser derives
 * its length line from the steps themselves, never from a hand-typed claim:
 * word count of the narration, divided by a stated reading rate.
 */
import type { Step } from "./types";

export interface Cut {
  /** URL-safe id, carried in `?cut=<id>`. */
  id: string;
  /** Big label on the chooser card ("Full", "Medium", "Short"). */
  label: string;
  /** One line under the label: what this cut is for. */
  blurb: string;
  steps: Step[];
}

/**
 * A READING-RATE ASSUMPTION, not a measurement of the owner's delivery: the
 * commonly quoted 130-160 words/minute range for spoken English, midpoint
 * rounded. Every "minutes of narration" figure on the chooser divides by
 * this one constant, and the card prints it next to the figure.
 */
export const NARRATION_WORDS_PER_MINUTE = 145;

/** Markdown the narration callout renders, stripped roughly enough that markers do not count as words. */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_#>]/g, "")
    .replace(/^\s*[-+]\s+/gm, "");
}

function wordsIn(text: string | undefined): number {
  if (!text) return 0;
  return stripMarkdown(text)
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Words in every step's `narration` plus `narrationAfter` (both are spoken when the step has both). */
export function narrationWordCount(steps: Step[]): number {
  return steps.reduce((sum, s) => sum + wordsIn(s.narration) + wordsIn(s.narrationAfter), 0);
}

/** Minutes to read `words` aloud at NARRATION_WORDS_PER_MINUTE (not rounded). */
export function narrationMinutes(words: number): number {
  return words / NARRATION_WORDS_PER_MINUTE;
}
