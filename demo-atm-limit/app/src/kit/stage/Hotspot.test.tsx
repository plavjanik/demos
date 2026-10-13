// @vitest-environment jsdom
/**
 * Keyboard "next" on a step with an un-fired hotspot must fire that hotspot
 * (a clicker only sends keys); once fired, or with no hotspot, it advances.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { StepEngineProvider, useStepEngine } from "../engine/StepEngine";
import type { Step } from "../engine/types";
import { Hotspot } from "./Hotspot";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mkStep = (id: string, hotspot?: boolean): Step =>
  ({ id, title: id, caption: "", ...(hotspot ? { hotspot: { target: "t" } } : {}) }) as unknown as Step;

let root: Root;
let host: HTMLElement;
let snap: { index: number; fired: boolean };

function Probe({
  onActivate,
  advanceOnActivate,
}: {
  onActivate?: () => void | Promise<void>;
  advanceOnActivate?: boolean;
}) {
  const e = useStepEngine();
  snap = { index: e.index, fired: e.hotspotFired };
  return (
    <Hotspot id="t" onActivate={onActivate} advanceOnActivate={advanceOnActivate}>
      <span>x</span>
    </Hotspot>
  );
}

function mount(steps: Step[], probe: Parameters<typeof Probe>[0] = {}) {
  window.location.hash = "";
  act(() => {
    root.render(
      <StepEngineProvider steps={steps}>
        <Probe {...probe} />
      </StepEngineProvider>,
    );
  });
}
const press = (key: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  });

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("forward key on a step with a hotspot", () => {
  it("advancing hotspot without onActivate: PageDown advances as before", () => {
    mount([mkStep("a", true), mkStep("b")]);
    press("PageDown");
    expect(snap.index).toBe(1);
  });

  it("non-advancing hotspot: first PageDown fires onActivate and stays, second advances", async () => {
    const onActivate = vi.fn();
    mount([mkStep("a", true), mkStep("b")], { onActivate, advanceOnActivate: false });
    press("PageDown");
    await act(async () => {});
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(snap).toEqual({ index: 0, fired: true });
    press("PageDown");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(snap.index).toBe(1);
  });

  it("a second PageDown while onActivate is pending is ignored", async () => {
    let resolve!: () => void;
    const onActivate = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    mount([mkStep("a", true), mkStep("b")], { onActivate, advanceOnActivate: false });
    press("PageDown");
    press("PageDown");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(snap).toEqual({ index: 0, fired: false });
    await act(async () => resolve());
    expect(snap).toEqual({ index: 0, fired: true });
    press("PageDown");
    expect(snap.index).toBe(1);
  });

  it("a step with no hotspot: PageDown advances", () => {
    mount([mkStep("a"), mkStep("b")]);
    press("PageDown");
    expect(snap.index).toBe(1);
  });

  it("PageUp goes back without firing a pending hotspot", () => {
    const onActivate = vi.fn();
    window.location.hash = "";
    mount([mkStep("a"), mkStep("b", true)], { onActivate, advanceOnActivate: false });
    press("PageDown");
    expect(snap.index).toBe(1);
    press("PageUp");
    expect(snap.index).toBe(0);
    expect(onActivate).not.toHaveBeenCalled();
  });
});
