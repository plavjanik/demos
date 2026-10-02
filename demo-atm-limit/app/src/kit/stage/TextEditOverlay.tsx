/**
 * Review-mode in-place text editing: hover any text on the stage (a
 * caption, a heading, a chat message, a diagram node label, an ATM label,
 * a code line) to show a small pencil badge; click it to edit the text
 * directly where it sits. Mounted by DemoApp only while reviewMode is on
 * (see TextEditOverlayGate below) — nothing about this exists in the DOM,
 * not even a dormant listener, while review mode is off.
 *
 * Generic on purpose: this file knows nothing about any scene's markup
 * beyond the shared conventions textEditPath.ts already documents
 * (`[data-line]` for a code line, `[data-node]` for a diagram node, plain
 * text elsewhere). A leaf becomes `contentEditable` directly — no shadow
 * textarea — so editing a multi-line code line or a wrapped caption looks
 * exactly like editing it will read once applied.
 *
 * Persistence and re-apply: a commit stores `{stepId, path, original,
 * edited}` via StepEngine's `upsertTextEdit` (see reviewData.ts's TextEdit).
 * Because `dangerouslySetInnerHTML` (Editor.tsx) and plain prop-driven text
 * (everywhere else) are both React-owned, an unrelated re-render on the
 * SAME step can silently reset a leaf's DOM text back to its authored
 * value — React's own reconciliation has no idea this file mutated that
 * node out of band. A MutationObserver on `.stage-inner`, debounced ~50ms
 * and guarded against its OWN writes, re-applies every one of the CURRENT
 * step's stored edits whenever that happens: if the resolved element's
 * live text is exactly `original`, write `edited` back in (React reset it,
 * safe to redo); if it already reads `edited`, nothing to do; anything
 * else (or the path no longer resolves at all) means the underlying
 * content genuinely changed since the edit was made — left alone, and
 * flagged `stale` for the export instead of blindly overwritten.
 *
 * Keyboard guard: StepEngine's own `isEditableFocused()` already checks
 * `document.activeElement.isContentEditable` — the instant a leaf becomes
 * editable and takes focus, that check is true, so the step engine's
 * arrows/Space/S/R stop firing with NO change needed there (narrationAudio
 * .tsx's identical copy of that guard covers "V" the same way). Only
 * Enter/Escape need handling here, since the step engine listens for
 * neither.
 */
import { useEffect, useRef, useState } from "react";
import { useStepEngine } from "../engine/StepEngine";
import { buildTextEditPath, findTextLeaf, resolveTextEditPath } from "./textEditPath";
import "./TextEditOverlay.css";

function placeCaretAtEnd(el: HTMLElement): void {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

const REAPPLY_DEBOUNCE_MS = 50;

export function TextEditOverlay(): React.JSX.Element | null {
  const { step, reviewData, upsertTextEdit, removeTextEdit } = useStepEngine();
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hoveredLeafRef = useRef<Element | null>(null);
  const editingRef = useRef<{ leaf: Element; path: string; original: string; reverting: boolean } | null>(null);
  const applyingRef = useRef(false);
  // Kept fresh every render so the reapply effect below can read the
  // CURRENT reviewData on each pass without needing it in its own
  // dependency array — see that effect's own comment for why closing over
  // one fixed snapshot of `textEdits` was a real bug (a stale flag this
  // pass itself just set could never be read back and cleared by a LATER
  // pass in the same step-mount lifetime).
  const reviewDataRef = useRef(reviewData);
  reviewDataRef.current = reviewData;

  // Hover tracking — suspended entirely while an edit is in progress (the
  // pencil for whatever's under the cursor is irrelevant mid-edit, and
  // recomputing it would fight the user's own selection/typing).
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (editingRef.current) return;
      const stageRoot = document.querySelector<HTMLElement>(".stage-inner");
      const target = e.target as Element | null;
      // The pencil itself sits OUTSIDE .stage-inner (it's a fixed-position
      // sibling of Stage, see the file header) — moving the mouse from a
      // leaf's text onto its own badge would otherwise findTextLeaf() to
      // null right here and hide the badge out from under the cursor
      // that's hovering it, making it unclickable in practice. Leave the
      // current hover alone while over the pencil; a real leaf-to-leaf
      // move always passes back through stage-inner first, which still
      // updates it normally.
      if (target?.closest(".text-edit-pencil")) return;
      if (!stageRoot || !target) {
        if (hoveredLeafRef.current) {
          hoveredLeafRef.current = null;
          setHoverRect(null);
        }
        return;
      }
      const leaf = findTextLeaf(target, stageRoot);
      if (leaf === hoveredLeafRef.current) return;
      hoveredLeafRef.current = leaf;
      setHoverRect(leaf ? leaf.getBoundingClientRect() : null);
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // Reapply pass: runs once on step change (a fresh scene may already have
  // stored edits waiting — e.g. a chat message whose stagger reveal hasn't
  // rendered it yet at mount time, needing a LATER pass once it has) and
  // again whenever the stage's own DOM mutates. Reads `reviewDataRef`
  // fresh on every call (not a value captured once when the effect ran) —
  // `reviewData` itself stays OUT of this effect's dependency array (a
  // pass's own `upsertTextEdit` call would otherwise re-run the whole
  // effect, tearing down and rebuilding the MutationObserver every time it
  // fires one).
  useEffect(() => {
    const stageRoot = document.querySelector<HTMLElement>(".stage-inner");
    if (!stageRoot) return;

    const reapply = () => {
      const edits = reviewDataRef.current[step.id]?.textEdits ?? [];
      if (edits.length === 0) return;
      applyingRef.current = true;
      for (const edit of edits) {
        // Never fight the user while THIS exact leaf is being typed into.
        if (editingRef.current?.path === edit.path) continue;
        const el = resolveTextEditPath(stageRoot, edit.path);
        if (!el) {
          if (!edit.stale) upsertTextEdit({ ...edit, stale: true });
          continue;
        }
        const current = (el.textContent ?? "").trim();
        if (current === edit.edited) {
          if (edit.stale) upsertTextEdit({ ...edit, stale: false });
          continue;
        }
        if (current === edit.original) {
          el.textContent = edit.edited;
          if (edit.stale) upsertTextEdit({ ...edit, stale: false });
        } else if (!edit.stale) {
          upsertTextEdit({ ...edit, stale: true });
        }
      }
      applyingRef.current = false;
    };

    reapply();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const mo = new MutationObserver(() => {
      if (applyingRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(reapply, REAPPLY_DEBOUNCE_MS);
    });
    mo.observe(stageRoot, { childList: true, subtree: true, characterData: true });
    return () => {
      if (timer) clearTimeout(timer);
      mo.disconnect();
    };
    // reviewData is intentionally excluded: upsertTextEdit inside reapply()
    // changes it (staleness flips), which would otherwise re-run this whole
    // effect (tearing down and rebuilding the observer) on every pass this
    // function itself causes. Re-running on step.id change is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  const beginEdit = (leaf: Element) => {
    const stageRoot = document.querySelector<HTMLElement>(".stage-inner");
    if (!stageRoot) return;
    const path = buildTextEditPath(stageRoot, leaf);
    if (!path) return;
    const existing = (reviewData[step.id]?.textEdits ?? []).find((e) => e.path === path);
    const original = existing?.original ?? (leaf.textContent ?? "").trim();
    editingRef.current = { leaf, path, original, reverting: false };
    hoveredLeafRef.current = null;
    setHoverRect(null);
    (leaf as HTMLElement).contentEditable = "true";
    leaf.classList.add("text-edit-editing");
    placeCaretAtEnd(leaf as HTMLElement);
  };

  const endEdit = (leaf: Element) => {
    (leaf as HTMLElement).contentEditable = "false";
    leaf.classList.remove("text-edit-editing");
    editingRef.current = null;
  };

  const commit = () => {
    const editing = editingRef.current;
    if (!editing) return;
    const { leaf, path, original } = editing;
    const edited = (leaf.textContent ?? "").trim();
    endEdit(leaf);
    if (edited === original) {
      // Typed back to the shipped text by hand — drop any stored edit
      // rather than persist a no-op that would still show up in the panel
      // and the export.
      removeTextEdit(step.id, path);
      return;
    }
    upsertTextEdit({ stepId: step.id, path, original, edited });
  };

  const revert = () => {
    const editing = editingRef.current;
    if (!editing) return;
    editing.reverting = true;
    editing.leaf.textContent = editing.original;
    endEdit(editing.leaf);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const editing = editingRef.current;
      if (!editing) return;
      if (e.target !== editing.leaf) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        revert();
      }
    };
    const onBlur = (e: FocusEvent) => {
      const editing = editingRef.current;
      if (!editing || e.target !== editing.leaf) return;
      if (editing.reverting) return; // revert() already tore down state
      commit();
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", onBlur, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", onBlur, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  if (!hoverRect) return null;

  return (
    <button
      type="button"
      className="text-edit-pencil"
      style={{ left: hoverRect.right, top: hoverRect.top }}
      aria-label="Edit this text"
      onClick={() => {
        const leaf = hoveredLeafRef.current;
        if (leaf) beginEdit(leaf);
      }}
      // Keep the leaf's own hover/click from firing through the pencil.
      onMouseDown={(e) => e.stopPropagation()}
    >
      ✎
    </button>
  );
}

/** Nothing about text editing exists in the DOM while review mode is off — mirrors ReviewPanelGate in DemoApp.tsx. */
export function TextEditOverlayGate(): React.JSX.Element | null {
  const { reviewMode } = useStepEngine();
  return reviewMode ? <TextEditOverlay /> : null;
}
