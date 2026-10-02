import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_ATM_RECIPIENT_LENGTH, readAtmRecipientOverride, writeAtmRecipientOverride } from "./presenterSettings";

interface FakeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function fakeLocalStorage(initial: Record<string, string> = {}): FakeStorage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
}

/** Stubs the globals presenterSettings.ts reads — `window.localStorage` and `window.location.search` — without pulling in jsdom; returns the fake storage so a test can reuse it across two reads with different search strings. */
function setupWindow(search = "", storage: FakeStorage = fakeLocalStorage()): FakeStorage {
  vi.stubGlobal("window", { localStorage: storage, location: { search } });
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readAtmRecipientOverride / writeAtmRecipientOverride round trip", () => {
  it("returns null when nothing is stored", () => {
    setupWindow();
    expect(readAtmRecipientOverride("techutex-")).toBeNull();
  });

  it("round-trips a written override", () => {
    setupWindow();
    writeAtmRecipientOverride("techutex-", "JANE DOE");
    expect(readAtmRecipientOverride("techutex-")).toBe("JANE DOE");
  });

  it("keeps two demos' overrides independent via keyPrefix", () => {
    setupWindow();
    writeAtmRecipientOverride("techutex-", "JANE DOE");
    writeAtmRecipientOverride("", "JOHN SMITH");
    expect(readAtmRecipientOverride("techutex-")).toBe("JANE DOE");
    expect(readAtmRecipientOverride("")).toBe("JOHN SMITH");
  });

  it("clears a stored override by writing null", () => {
    setupWindow();
    writeAtmRecipientOverride("techutex-", "JANE DOE");
    writeAtmRecipientOverride("techutex-", null);
    expect(readAtmRecipientOverride("techutex-")).toBeNull();
  });

  it("falls back to null/no-op when localStorage throws (private window / blocked storage)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
      location: { search: "" },
    });
    expect(readAtmRecipientOverride("techutex-")).toBeNull();
    expect(() => writeAtmRecipientOverride("techutex-", "JANE DOE")).not.toThrow();
  });
});

describe("?name= one-shot precedence", () => {
  it("wins over a stored override for this read", () => {
    setupWindow("?name=JANE%20DOE");
    writeAtmRecipientOverride("techutex-", "STORED NAME");
    expect(readAtmRecipientOverride("techutex-")).toBe("JANE DOE");
  });

  it("does not persist — a later read with no ?name= sees the stored value, unchanged", () => {
    const storage = setupWindow("?name=JANE%20DOE");
    writeAtmRecipientOverride("techutex-", "STORED NAME");
    readAtmRecipientOverride("techutex-"); // the one-shot read itself

    setupWindow("", storage); // same storage, no ?name= this time
    expect(readAtmRecipientOverride("techutex-")).toBe("STORED NAME");
  });

  it("applies even with nothing stored", () => {
    setupWindow("?name=JANE%20DOE");
    expect(readAtmRecipientOverride("techutex-")).toBe("JANE DOE");
  });

  it("truncates to MAX_ATM_RECIPIENT_LENGTH", () => {
    const long = "A".repeat(40);
    setupWindow(`?name=${long}`);
    const result = readAtmRecipientOverride("techutex-");
    expect(result).toHaveLength(MAX_ATM_RECIPIENT_LENGTH);
    expect(result).toBe(long.slice(0, MAX_ATM_RECIPIENT_LENGTH));
  });

  it("falls through to the stored value when ?name= is absent or empty", () => {
    setupWindow("?name=");
    writeAtmRecipientOverride("techutex-", "STORED NAME");
    expect(readAtmRecipientOverride("techutex-")).toBe("STORED NAME");
  });
});
