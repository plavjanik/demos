/**
 * `npx tsx demo-atm-limit/atm/cli.ts withdraw <amount> [toAddress]`
 * Prints the balance before the withdrawal, the withdrawal result, and the
 * elapsed time of each stage (stderr) — exits 0 if accepted, 1 otherwise.
 */
import { Atm } from "./atm.js";

const [command, amount, toAddress] = process.argv.slice(2);
if (command !== "withdraw" || !amount) {
  console.error("usage: cli.ts withdraw <amount> [toAddress]");
  process.exit(2);
}

async function timed<T>(label: string, work: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await work();
  console.error(`${label}: ${Date.now() - start}ms`);
  return result;
}

const atm = await timed("open", () => Atm.open());
try {
  console.log(`Balance before: ${atm.balance()} DOGE`);
  const result = await timed("withdraw", () => atm.withdraw(amount!, toAddress));
  console.log(`${result.accepted ? "ACCEPTED" : "REJECTED"}: ${result.message}`);
  process.exitCode = result.accepted ? 0 : 1;
} finally {
  await timed("close", () => atm.close());
}
