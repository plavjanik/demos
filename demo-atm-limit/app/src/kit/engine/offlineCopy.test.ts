import { describe, expect, it } from "vitest";
import { markOfflineCopy } from "./offlineCopy";

describe("markOfflineCopy", () => {
  it("adds the marker to the html tag only", () => {
    const out = markOfflineCopy('<!doctype html>\n<html lang="en" data-theme="dark">\n<head></head>');
    expect(out).toContain('<html data-offline-copy="" lang="en" data-theme="dark">');
    expect(out.match(/data-offline-copy/g)).toHaveLength(1);
  });
  it("is idempotent", () => {
    const once = markOfflineCopy("<html>");
    expect(markOfflineCopy(once)).toBe(once);
  });
  it("throws without an html tag", () => {
    expect(() => markOfflineCopy("<div></div>")).toThrow();
  });
});
