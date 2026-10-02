/**
 * The Doge ATM's existing behaviour against the live DOGECICS application,
 * pinned so a change to the host program cannot regress it unnoticed.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Atm } from "../atm/atm.js";

let atm: Atm;

beforeAll(async () => {
  atm = await Atm.open();
}, 120_000);

afterAll(async () => {
  await atm?.close();
}, 60_000);

describe("existing behaviour", () => {
  test("shows the account balance", () => {
    expect(atm.balance()).toMatch(/^\d{1,3}(,\d{3})*\.\d{8}$/);
  });

  test("lists the recent transactions with date, label, sign and amount", async () => {
    const recent = await atm.recentTransactions();
    expect(recent.length).toBeGreaterThan(0);
    for (const t of recent) {
      expect(t.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(t.label).not.toBe("");
      expect(["+", "-"]).toContain(t.sign);
      expect(t.amount).toMatch(/^[\d,]+\.\d{8}$/);
    }
  });

  test("rejects a send to the placeholder address", async () => {
    const result = await atm.withdraw("5", "Enter address here");
    expect(result.accepted).toBe(false);
    expect(result.message).toContain("Invalid DOGE Coin address");
  });

  test("sends an ordinary amount", async () => {
    const result = await atm.withdraw("5");
    expect(result.accepted).toBe(true);
    expect(result.message).toMatch(/^SENDING\s+5\s+DOGE$/);
  });
});
