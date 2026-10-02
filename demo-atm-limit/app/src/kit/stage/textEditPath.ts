/**
 * A stable DOM locator for TextEditOverlay.tsx's in-place text edits,
 * relative to the stage root (`.stage-inner`): at each level, prefer a data
 * attribute the rest of the kit already stamps for its own reasons
 * (`data-line` — Editor.tsx's code lines, `data-node` — ProcessScene.tsx's
 * diagram nodes, `data-hotspot` — Hotspot.tsx's active target, `data-step-key`
 * — none of today's scenes add one, listed for a future scene that needs
 * this to stay stable across re-renders the way the others already are),
 * else fall back to `tag:nth-of-type(n)` among same-tag siblings. Pure DOM
 * walking, no React — testable with a plain jsdom fixture, and reusable
 * by the review export (buildReviewMarkdown) with no live DOM at all
 * (it only ever prints the stored path string).
 */
const STABLE_ATTRS = ["data-line", "data-node", "data-hotspot", "data-step-key"];

export type PathSegment = { kind: "attr"; attr: string; value: string } | { kind: "index"; tag: string; index: number };

function segmentForElement(el: Element): PathSegment {
  for (const attr of STABLE_ATTRS) {
    const value = el.getAttribute(attr);
    if (value !== null) return { kind: "attr", attr, value };
  }
  const tag = el.tagName.toLowerCase();
  let index = 1;
  let sib = el.previousElementSibling;
  while (sib) {
    if (sib.tagName.toLowerCase() === tag) index++;
    sib = sib.previousElementSibling;
  }
  return { kind: "index", tag, index };
}

function formatSegment(seg: PathSegment): string {
  return seg.kind === "attr" ? `[${seg.attr}="${seg.value}"]` : `${seg.tag}:nth-of-type(${seg.index})`;
}

const ATTR_SEGMENT_RE = /^\[([a-zA-Z0-9-]+)="([^"]*)"\]$/;
const INDEX_SEGMENT_RE = /^([a-zA-Z0-9]+):nth-of-type\((\d+)\)$/;

function parseSegment(text: string): PathSegment | null {
  const attrMatch = ATTR_SEGMENT_RE.exec(text);
  if (attrMatch) return { kind: "attr", attr: attrMatch[1]!, value: attrMatch[2]! };
  const indexMatch = INDEX_SEGMENT_RE.exec(text);
  if (indexMatch) return { kind: "index", tag: indexMatch[1]!, index: Number(indexMatch[2]) };
  return null;
}

/** null when `leaf` isn't a descendant of `stageRoot` at all. */
export function buildTextEditPath(stageRoot: Element, leaf: Element): string | null {
  const segments: PathSegment[] = [];
  let node: Element | null = leaf;
  while (node && node !== stageRoot) {
    segments.unshift(segmentForElement(node));
    node = node.parentElement;
  }
  if (node !== stageRoot) return null;
  return segments.map(formatSegment).join(" > ");
}

/** null when the path is malformed, or no longer resolves under `stageRoot` (a segment's attribute value or nth-of-type position no longer exists — the caller treats this the same as "stale"). */
export function resolveTextEditPath(stageRoot: Element, path: string): Element | null {
  if (!path) return null;
  const segments: PathSegment[] = [];
  for (const raw of path.split(" > ")) {
    const seg = parseSegment(raw);
    if (!seg) return null;
    segments.push(seg);
  }
  let node: Element = stageRoot;
  for (const seg of segments) {
    const children = Array.from(node.children);
    let found: Element | undefined;
    if (seg.kind === "attr") {
      found = children.find((c) => c.getAttribute(seg.attr) === seg.value);
    } else {
      let count = 0;
      for (const c of children) {
        if (c.tagName.toLowerCase() === seg.tag) {
          count++;
          if (count === seg.index) {
            found = c;
            break;
          }
        }
      }
    }
    if (!found) return null;
    node = found;
  }
  return node;
}

/** Inline elements a text leaf may nest — anything else (a block, a button, a nested leaf-worthy container) means the hovered element is a CONTAINER of leaves, not a leaf itself. */
const INLINE_TAGS = new Set(["SPAN", "CODE", "STRONG", "EM", "A"]);

/** Buttons/inputs/textareas/already-editable elements, plus the three chrome regions TextEditOverlay.tsx never touches (structurally outside the stage already, but checked explicitly too — see findTextLeaf's own doc comment). */
const EXCLUDED_SELECTOR =
  "button, input, textarea, [contenteditable], .review-panel, .narration-callout, .presenter-bar";

function isTextLeafCandidate(el: Element): boolean {
  if (!el.textContent || el.textContent.trim() === "") return false;
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as Element | null;
  while (node) {
    if (!INLINE_TAGS.has(node.tagName)) return false;
    node = walker.nextNode() as Element | null;
  }
  return true;
}

/**
 * The nearest "text leaf" at or above `target`, within `stageRoot` — the
 * whole `[data-line]` line for the code editor (its shiki-highlighted
 * spans are never drilled into individually), else the closest ancestor
 * (starting at `target` itself) whose own trimmed text is non-empty and
 * whose only descendant elements are inline ones (`isTextLeafCandidate`).
 * `null` when `target` sits outside `stageRoot`, inside an excluded
 * region/control, or no qualifying ancestor exists before `stageRoot`.
 */
export function findTextLeaf(target: Element, stageRoot: Element): Element | null {
  if (!stageRoot.contains(target)) return null;

  const line = target.closest("[data-line]");
  if (line && stageRoot.contains(line)) return line;

  let node: Element | null = target;
  while (node && node !== stageRoot) {
    if (node.matches(EXCLUDED_SELECTOR)) return null;
    if (isTextLeafCandidate(node)) return node;
    node = node.parentElement;
  }
  return null;
}
