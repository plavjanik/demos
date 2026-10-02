/**
 * The daily withdrawal limit (10,000 DOGE per day) of the Doge ATM against
 * the live DOGECICS application. Each run spends about 1,100 DOGE of the day's
 * allowance; jcl/RESEED.jcl restores the seed data.
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

describe("daily withdrawal limit (10,000 DOGE per day)", () => {
  test("refuses a single withdrawal over the limit", async () => {
    const result = await atm.withdraw("10001");
    expect(result.accepted).toBe(false);
    expect(result.message).toMatch(/DAILY LIMIT/);
  });

  test("still accepts an amount under the limit", async () => {
    const result = await atm.withdraw("100");
    expect(result.accepted).toBe(true);
  });

  test("accepts an amount with decimals", async () => {
    const result = await atm.withdraw("999.5");
    expect(result.accepted).toBe(true);
  });

  test("counts withdrawals cumulatively within the day", async () => {
    // 5 + 100 + 999.5 DOGE have been sent so far in this run; 9,000 more would exceed 10,000.
    const result = await atm.withdraw("9000");
    expect(result.accepted).toBe(false);
    expect(result.message).toMatch(/DAILY LIMIT/);
  });
});
