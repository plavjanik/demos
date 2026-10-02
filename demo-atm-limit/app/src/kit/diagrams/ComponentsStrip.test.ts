import { describe, expect, it } from "vitest";
import { boxCentersFromRects } from "./ComponentsStrip";

describe("boxCentersFromRects", () => {
  it("returns unscaled (design-space) centers at scale 1 (container rect width equals its own offsetWidth)", () => {
    const containerRect = { left: 100, width: 600 };
    const boxRects = [
      { left: 100, width: 100 }, // center at design-space 50
      { left: 500, width: 100 }, // center at design-space 450
    ];
    expect(boxCentersFromRects(containerRect, boxRects, 600)).toEqual([50, 450]);
  });

  it("divides SCREEN-pixel rects by the track's own scale factor, so a 0.5-scaled container yields unscaled centers", () => {
    // Stage.tsx scales `.stage-inner` (and everything under it, boxes
    // included) with a CSS transform: at scale 0.5 every getBoundingClientRect()
    // reading — container and boxes alike — comes back at half its design-space
    // size, while the container's own offsetWidth (layout space, unaffected by
    // the transform) still reads the full design-space width.
    const scale = 0.5;
    const containerOffsetWidth = 600; // design-space width
    const containerRect = { left: 50, width: containerOffsetWidth * scale }; // 300, screen px
    const boxRects = [
      { left: 50, width: 50 }, // design-space: left 100, width 100 -> center 150 -> center 50 relative to container's design-space left
      { left: 250, width: 50 }, // design-space: left 500, width 100 -> center 550 -> center 450 relative
    ];
    expect(boxCentersFromRects(containerRect, boxRects, containerOffsetWidth)).toEqual([50, 450]);
  });

  it("falls back to scale 1 when offsetWidth is 0 (an unmeasured/unmounted track), never dividing by zero", () => {
    const containerRect = { left: 0, width: 200 };
    const boxRects = [{ left: 0, width: 40 }];
    expect(boxCentersFromRects(containerRect, boxRects, 0)).toEqual([20]);
  });
});
