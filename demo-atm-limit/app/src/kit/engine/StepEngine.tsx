/**
 * The presenter's state machine: which step is showing, how to move between
 * steps (keyboard, hotspot click, step-rail click, hash deep-link), and the
 * "agent loop" timer HUD. Everything else in the app reads from this
 * context instead of holding its own notion of "current step". Takes its
 * `steps` from a prop (StepEngineProvider) rather than importing any one
 * demo's own steps module, so this whole engine is demo-agnostic.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Step } from "./types";
import { readReviewData, writeReviewData, type ReviewData, type ReviewEntry, type TextEdit } from "./reviewData";

export interface StepEngineValue {
  steps: Step[];
  index: number;
  step: Step;
  next: () => void;
  prev: () => void;
  first: () => void;
  goTo: (index: number) => void;
  railOpen: boolean;
  toggleRail: () => void;
  timerRunning: boolean;
  timerMs: number;
  instant: boolean;
  narrationVisible: boolean;
  toggleNarration: () => void;
  /** Whether the CURRENT step's hotspot has fired at least once since arriving on this step — resets on every step change. Drives Step.narrationAfter (a second callout once e.g. the ATM's confirm+reveal has happened) without coupling NarrationCallout to any one scene's own local state. */
  hotspotFired: boolean;
  markHotspotFired: () => void;
  /** Petr's own review mode: a docked panel for per-step feedback + live narration edits — see ReviewPanel.tsx. Off by default; never visible unless toggled or `?review` is in the URL. */
  reviewMode: boolean;
  toggleReviewMode: () => void;
  /** Whether the presenter bar is collapsed to just its small expand button (PresenterBar.tsx) — the audience-facing default is expanded on every load, never persisted. Driving --presenter-bar-height to 0px while collapsed is this context's job (see the effect below), not the component's, so every consumer of that variable (Stage, NarrationCallout, ReviewPanel, VoicePopover) follows without each needing to know about collapse. */
  barCollapsed: boolean;
  toggleBar: () => void;
  /** All steps' review entries — ReviewPanel.tsx reads/writes the CURRENT step's own slice via the setters below; NarrationCallout.tsx reads it (via reviewData.ts's effectiveText) to show an edited narration live. */
  reviewData: ReviewData;
  setReviewField: (stepId: string, field: keyof ReviewEntry, value: string) => void;
  /** Deletes the narration/narrationAfter overrides for one step (its feedback stays) — reverts NarrationCallout and the panel's textareas to the shipped text. */
  resetStepNarration: (stepId: string) => void;
  /** Inserts or replaces (by `edit.path`) one step's stored text edit — TextEditOverlay.tsx's commit and its re-apply pass (staleness updates) both go through this. */
  upsertTextEdit: (edit: TextEdit) => void;
  /** Drops one text edit (the review panel's ✕) — the leaf reverts to whatever it renders without an override on the next re-render/re-apply pass. */
  removeTextEdit: (stepId: string, path: string) => void;
  /** Drops every text edit on one step (the review panel's "clear text edits"). */
  clearTextEdits: (stepId: string) => void;
  clearAllReviewData: () => void;
}

const NARRATION_STORAGE_KEY = "demo-narration-visible";
const REVIEW_MODE_STORAGE_KEY = "demo-review-mode";

function readNarrationPreference(keyPrefix: string): boolean {
  try {
    const stored = window.localStorage.getItem(keyPrefix + NARRATION_STORAGE_KEY);
    if (stored !== null) return stored === "1";
  } catch {
    // private window / storage blocked — default to visible
  }
  return true;
}

function readReviewModePreference(keyPrefix: string): boolean {
  try {
    return window.localStorage.getItem(keyPrefix + REVIEW_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** A textarea/input/contentEditable has focus — every step-engine key (arrows, Space, S, R) must fall through to normal typing instead of navigating or toggling. */
function isEditableFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "TEXTAREA" || tag === "INPUT" || (el as HTMLElement).isContentEditable;
}

const StepEngineContext = createContext<StepEngineValue | null>(null);

function indexFromHash(steps: Step[]): number {
  const m = /^#step-(.+)$/.exec(window.location.hash);
  if (!m) return 0;
  const found = steps.findIndex((s) => s.id === m[1]);
  return found >= 0 ? found : 0;
}

export function StepEngineProvider({
  steps,
  children,
  demoId = "",
}: {
  steps: Step[];
  children: ReactNode;
  /**
   * Prefixes every review/narration localStorage key — DOGECICS passes
   * nothing (empty prefix, so its keys are the literal strings they always
   * were and Petr's existing notes stay readable); a second demo in the
   * same browser profile passes its own id so the two demos' review data
   * never share one blob (see reviewData.ts's readReviewData doc comment).
   */
  demoId?: string;
}): React.JSX.Element {
  const keyPrefix = demoId ? `${demoId}-` : "";
  const [index, setIndex] = useState<number>(() => indexFromHash(steps));
  const [railOpen, setRailOpen] = useState(false);
  const instant = useMemo(() => new URLSearchParams(window.location.search).has("instant"), []);

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const [narrationVisible, setNarrationVisible] = useState(() => readNarrationPreference(keyPrefix));
  const [hotspotFired, setHotspotFired] = useState(false);
  const markHotspotFired = useCallback(() => setHotspotFired(true), []);
  const toggleNarration = useCallback(() => {
    setNarrationVisible((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(keyPrefix + NARRATION_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore — nothing to remember it in this session
      }
      return next;
    });
  }, [keyPrefix]);

  // `?review` forces it on for this load (a link Petr can send himself);
  // toggling afterward (R key or the status bar control) is what persists.
  const [reviewMode, setReviewMode] = useState(
    () => new URLSearchParams(window.location.search).has("review") || readReviewModePreference(keyPrefix),
  );
  const [reviewData, setReviewData] = useState<ReviewData>(() => readReviewData(keyPrefix));
  // Expanded on every load, no persistence — the owner's own wording ("by
  // default it should be displayed/expanded"), unlike reviewMode/narration
  // above which remember the presenter's last choice.
  const [barCollapsed, setBarCollapsed] = useState(false);
  const toggleBar = useCallback(() => setBarCollapsed((v) => !v), []);
  const toggleReviewMode = useCallback(() => {
    setReviewMode((v) => {
      const nextValue = !v;
      try {
        window.localStorage.setItem(keyPrefix + REVIEW_MODE_STORAGE_KEY, nextValue ? "1" : "0");
      } catch {
        // ignore — nothing to remember it in this session
      }
      return nextValue;
    });
  }, [keyPrefix]);
  const setReviewField = useCallback(
    (stepId: string, field: keyof ReviewEntry, value: string) => {
      setReviewData((prev) => {
        const prevEntry = prev[stepId];
        const entry: ReviewEntry = { ...prevEntry, [field]: value };
        // Record the shipped text this override was typed against, the
        // FIRST time this field is ever edited on this step — never
        // overwritten by a later re-edit (reviewData.ts's effectiveText
        // compares it against the CURRENT shipped text to decide staleness,
        // same "original never drifts forward" rule as TextEdit.original).
        if (field === "narration" && prevEntry?.narrationOriginal === undefined) {
          const step = steps.find((s) => s.id === stepId);
          entry.narrationOriginal = step?.narration ?? "";
        } else if (field === "narrationAfter" && prevEntry?.narrationAfterOriginal === undefined) {
          const step = steps.find((s) => s.id === stepId);
          entry.narrationAfterOriginal = step?.narrationAfter ?? "";
        }
        const next: ReviewData = { ...prev, [stepId]: entry };
        writeReviewData(next, keyPrefix);
        return next;
      });
    },
    [keyPrefix, steps],
  );
  const resetStepNarration = useCallback(
    (stepId: string) => {
      setReviewData((prev) => {
        if (!prev[stepId]) return prev;
        // Also drops the recorded originals — not just the override text —
        // so a fresh edit after a revert records a fresh original rather
        // than reusing one left over from the edit just discarded.
        const {
          narration: _n,
          narrationAfter: _na,
          narrationOriginal: _no,
          narrationAfterOriginal: _nao,
          ...restEntry
        } = prev[stepId]!;
        const next: ReviewData = { ...prev };
        if (Object.keys(restEntry).length > 0) next[stepId] = restEntry;
        else delete next[stepId];
        writeReviewData(next, keyPrefix);
        return next;
      });
    },
    [keyPrefix],
  );
  const upsertTextEdit = useCallback(
    (edit: TextEdit) => {
      setReviewData((prev) => {
        const existing = prev[edit.stepId]?.textEdits ?? [];
        const nextEdits = [...existing.filter((e) => e.path !== edit.path), edit];
        const next: ReviewData = { ...prev, [edit.stepId]: { ...prev[edit.stepId], textEdits: nextEdits } };
        writeReviewData(next, keyPrefix);
        return next;
      });
    },
    [keyPrefix],
  );
  const removeTextEdit = useCallback(
    (stepId: string, path: string) => {
      setReviewData((prev) => {
        const existing = prev[stepId]?.textEdits;
        if (!existing) return prev;
        const filtered = existing.filter((e) => e.path !== path);
        const entry = { ...prev[stepId] };
        if (filtered.length > 0) entry.textEdits = filtered;
        else delete entry.textEdits;
        const next: ReviewData = { ...prev };
        if (Object.keys(entry).length > 0) next[stepId] = entry;
        else delete next[stepId];
        writeReviewData(next, keyPrefix);
        return next;
      });
    },
    [keyPrefix],
  );
  const clearTextEdits = useCallback(
    (stepId: string) => {
      setReviewData((prev) => {
        if (!prev[stepId]?.textEdits) return prev;
        const entry = { ...prev[stepId] };
        delete entry.textEdits;
        const next: ReviewData = { ...prev };
        if (Object.keys(entry).length > 0) next[stepId] = entry;
        else delete next[stepId];
        writeReviewData(next, keyPrefix);
        return next;
      });
    },
    [keyPrefix],
  );
  const clearAllReviewData = useCallback(() => {
    setReviewData({});
    writeReviewData({}, keyPrefix);
  }, [keyPrefix]);

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(steps.length - 1, next)));
    },
    [steps.length],
  );
  const next = useCallback(() => setIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const first = useCallback(() => setIndex(0), []);
  const toggleRail = useCallback(() => setRailOpen((v) => !v), []);

  // Deep link: index -> hash (replaceState so it doesn't spam back/forward)
  useEffect(() => {
    const id = steps[index]!.id;
    const wanted = `#step-${id}`;
    if (window.location.hash !== wanted) {
      window.history.replaceState(null, "", wanted);
    }
  }, [index, steps]);

  // Every step starts with its hotspot un-fired.
  useEffect(() => {
    setHotspotFired(false);
  }, [index]);

  // hash -> index (back/forward buttons)
  useEffect(() => {
    const onHashChange = () => setIndex(indexFromHash(steps));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [steps]);

  // Keyboard navigation — none of this fires while a review-panel textarea
  // (or any other editable element) has focus, so typing "s"/"r"/Space into
  // a note never also toggles the rail, review mode, or advances a step.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableFocused()) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        first();
      } else if (e.key === "s" || e.key === "S") {
        toggleRail();
      } else if (e.key === "r" || e.key === "R") {
        toggleReviewMode();
      } else if (e.key === "b" || e.key === "B") {
        toggleBar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, prev, first, toggleRail, toggleReviewMode, toggleBar]);

  // Collapsing the bar reclaims its reserved strip: --presenter-bar-height
  // is defined on :root (styles/global.css), so an inline override on the
  // SAME element (documentElement) beats it while collapsed, and clearing
  // the inline value (not just setting "0px" back) restores the stylesheet
  // rule exactly — every consumer of the variable (Stage.css,
  // NarrationCallout.css, ReviewPanel.css, VoicePopover.css) follows with
  // no changes of their own.
  useEffect(() => {
    document.documentElement.style.setProperty("--presenter-bar-height", barCollapsed ? "0px" : "");
    return () => {
      document.documentElement.style.removeProperty("--presenter-bar-height");
    };
  }, [barCollapsed]);

  // Timer HUD: starts on the step flagged timerStart, freezes at timerStop.
  // It never ticks in wall-clock time — every step that wants the HUD to
  // move carries its own real captured elapsed stamp (Step.vscode
  // .timerElapsedMs, computed by whichever demo owns the timing data), and
  // the HUD just jumps straight to it. A step with no stamp leaves the HUD
  // showing whatever it last jumped to.
  useEffect(() => {
    const step = steps[index]!;
    if (step.timerStart) {
      setTimerMs(step.vscode?.timerElapsedMs ?? 0);
      setTimerRunning(true);
    } else if (step.vscode?.timerElapsedMs !== undefined) {
      setTimerMs(step.vscode.timerElapsedMs);
    }
    if (step.timerStop) {
      if (step.vscode?.timerElapsedMs !== undefined) setTimerMs(step.vscode.timerElapsedMs);
      setTimerRunning(false);
    }
  }, [index, steps]);

  const value: StepEngineValue = {
    steps,
    index,
    step: steps[index]!,
    next,
    prev,
    first,
    goTo,
    railOpen,
    toggleRail,
    timerRunning,
    timerMs,
    instant,
    narrationVisible,
    toggleNarration,
    hotspotFired,
    markHotspotFired,
    reviewMode,
    toggleReviewMode,
    barCollapsed,
    toggleBar,
    reviewData,
    setReviewField,
    resetStepNarration,
    upsertTextEdit,
    removeTextEdit,
    clearTextEdits,
    clearAllReviewData,
  };

  return <StepEngineContext.Provider value={value}>{children}</StepEngineContext.Provider>;
}

export function useStepEngine(): StepEngineValue {
  const ctx = useContext(StepEngineContext);
  if (!ctx) throw new Error("useStepEngine() outside <StepEngineProvider>");
  return ctx;
}
