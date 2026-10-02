// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { buildTextEditPath, resolveTextEditPath, findTextLeaf } from "./textEditPath";

function el(html: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

describe("buildTextEditPath / resolveTextEditPath round trip", () => {
  it("builds a data-attribute segment and resolves it back to the same element", () => {
    const stage = el(`
      <div>
        <div data-node="ticket"><div>Ticket</div></div>
        <div data-node="retrieve"><div>Search for sources</div></div>
      </div>
    `);
    const target = stage.querySelector('[data-node="retrieve"]')!.firstElementChild!;
    const path = buildTextEditPath(stage, target);
    expect(path).toBe('div:nth-of-type(1) > [data-node="retrieve"] > div:nth-of-type(1)');
    expect(resolveTextEditPath(stage, path!)).toBe(target);
  });

  it("falls back to tag:nth-of-type when no stable attribute is present, counting only same-tag siblings", () => {
    const stage = el(`
      <div>
        <span>skip</span>
        <p>first</p>
        <p>second</p>
      </div>
    `);
    const second = stage.querySelectorAll("p")[1]!;
    const path = buildTextEditPath(stage, second);
    expect(path).toBe("div:nth-of-type(1) > p:nth-of-type(2)");
    expect(resolveTextEditPath(stage, path!)).toBe(second);
  });

  it("prefers a data-line segment for a code editor line over its own position", () => {
    const stage = el(`<div><div class="code-block"><div data-line="3">const x = 1;</div></div></div>`);
    const line = stage.querySelector('[data-line="3"]')!;
    const path = buildTextEditPath(stage, line);
    expect(path).toBe('div:nth-of-type(1) > div:nth-of-type(1) > [data-line="3"]');
    expect(resolveTextEditPath(stage, path!)).toBe(line);
  });

  it("returns null when the leaf isn't inside the given stage root", () => {
    const stage = el(`<div><p>inside</p></div>`);
    const outsider = document.createElement("p");
    expect(buildTextEditPath(stage, outsider)).toBeNull();
  });

  it("resolveTextEditPath returns null once a segment no longer matches (structure changed)", () => {
    const stage = el(`<div><p>only one</p></div>`);
    expect(resolveTextEditPath(stage, "div:nth-of-type(1) > p:nth-of-type(2)")).toBeNull();
    expect(resolveTextEditPath(stage, '[data-node="missing"]')).toBeNull();
  });

  it("resolveTextEditPath returns null for a malformed path string", () => {
    const stage = el(`<div><p>x</p></div>`);
    expect(resolveTextEditPath(stage, "not a valid path")).toBeNull();
  });
});

describe("findTextLeaf", () => {
  let stage: HTMLElement;
  beforeEach(() => {
    // Deliberately NOT attached to document.body: every test below reuses
    // the same ids (#caption, #btn, #label, #withicon), and jsdom's ID
    // lookup is document-wide — attaching would make stage.querySelector
    // ("#id") liable to resolve to a DIFFERENT test's leftover element
    // rather than the one inside THIS test's own `stage` subtree. None of
    // findTextLeaf's own DOM calls (querySelector/closest/matches/
    // TreeWalker) require the tree to be attached.
    stage = el(`
      <div>
        <p id="caption">A plain <strong>caption</strong> line.</p>
        <p id="withicon">Hello <span class="icon"></span> world</p>
        <button id="btn">Click me</button>
        <div class="proc-node" data-node="ticket"><div id="label">Ticket</div></div>
        <div class="code-block"><div data-line="1"><span>const</span> <span>x</span></div></div>
        <div class="empty"></div>
      </div>
    `);
  });

  it("returns the paragraph itself when hovering its own text (inline-only children)", () => {
    const p = stage.querySelector("#caption")!;
    expect(findTextLeaf(p, stage)).toBe(p);
  });

  it("returns the inline element itself when hovering directly over it (still a valid, finer leaf)", () => {
    const strong = stage.querySelector("strong")!;
    expect(findTextLeaf(strong, stage)).toBe(strong);
  });

  it("excludes a real button entirely, even though its text would otherwise qualify", () => {
    const btn = stage.querySelector("#btn")!;
    expect(findTextLeaf(btn, stage)).toBeNull();
  });

  it("picks the whole data-line element for anything inside a code line, ignoring nested spans", () => {
    const span = stage.querySelector('[data-line="1"] span')!;
    const line = stage.querySelector('[data-line="1"]')!;
    expect(findTextLeaf(span, stage)).toBe(line);
  });

  it("finds a data-node label directly when it's the hovered element itself", () => {
    const label = stage.querySelector("#label")!;
    expect(findTextLeaf(label, stage)).toBe(label);
  });

  it("climbs from a non-qualifying node (an empty inline icon) up to its qualifying paragraph ancestor", () => {
    const icon = stage.querySelector(".icon")!;
    const p = stage.querySelector("#withicon")!;
    expect(findTextLeaf(icon, stage)).toBe(p);
  });

  it("returns null for an empty element with no qualifying ancestor before stageRoot", () => {
    const empty = stage.querySelector(".empty")!;
    expect(findTextLeaf(empty, stage)).toBeNull();
  });

  it("returns null for a target outside the stage root", () => {
    const outsider = document.createElement("p");
    outsider.textContent = "not on stage";
    expect(findTextLeaf(outsider, stage)).toBeNull();
  });
});
