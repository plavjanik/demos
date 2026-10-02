/**
 * Low-level screen-driving helpers shared by every stage of the ATM flow:
 * waiting for a host repaint, finding the active command line on either a
 * formatted or a genuinely unformatted screen, and reading raw row text.
 */
import type { Session } from "@panelwright/core";

/** Press ENTER (waiting for each repaint) until `until` matches, or `tries` is exhausted. */
export async function pressThrough(session: Session, until: RegExp, tries = 8): Promise<boolean> {
  const matched = () => until.test(session.render({ mode: "full" }));
  for (let i = 0; i < tries; i++) {
    const deadline = Date.now() + 6000;
    while (!matched() && Date.now() < deadline) {
      await session.waitFor({ change: true }, { timeoutMs: Math.max(200, deadline - Date.now()) }).catch(() => {});
    }
    if (matched()) return true;
    await session.press("ENTER");
  }
  return matched();
}

/** The formatted screen's command line, or `typeRaw` on a genuinely unformatted one. */
export function enterCommand(session: Session, text: string): void {
  const fields = session.fields();
  if (fields.length === 0) {
    session.typeRaw(text);
    return;
  }
  const target = fields[fields.length - 1]!;
  session.type({ at: { row: target.row, col: target.col } }, text);
}

/** Row `row`'s raw text (0-based), stripped of `render({mode:"full"})`'s "NN: " prefix. */
export function rowText(session: Session, row: number): string {
  const line = session.render({ mode: "full", rows: { from: row, to: row } }).split("\n")[2] ?? "";
  return line.slice(4);
}

/** TSO logon (cold-start tolerant), through ISPF's primary menu if presented, to READY. */
export async function tsoLogon(session: Session, user: string, password: string): Promise<void> {
  const s = session;
  if (s.fields().length === 0) await s.press("ENTER");
  const deadline = Date.now() + 60000;
  while (s.fields().length === 0 && Date.now() < deadline) {
    await s.waitFor({ change: true }, { timeoutMs: 5000 }).catch(() => {});
    if (s.fields().length === 0) await s.press("ENTER");
  }

  let loggedOn = false;
  for (let attempt = 0; attempt < 2 && !loggedOn; attempt++) {
    s.type({ nth: 1 }, `TSO ${user}`);
    await s.press("ENTER");
    loggedOn = await pressThrough(s, /PASSWORD|IN USE|INPUT NOT RECOGNIZED/);
    const screen = s.render({ mode: "full" });
    if (/IN USE/.test(screen)) throw new Error(`${user} is stranded IN USE — restart the container and retry`);
    if (/INPUT NOT RECOGNIZED/.test(screen)) {
      loggedOn = false;
      continue;
    }
    if (!/PASSWORD/.test(screen)) loggedOn = false;
  }
  if (!loggedOn) throw new Error("TSO logon never reached the password prompt");

  // The host paints a VISIBLE decoy on the same row as the label, one row
  // above the real (non-display) field — `below:`, never `after:`, or the
  // password echoes on screen and transmits in clear.
  s.type({ below: `PASSWORD FOR ${user}` }, password);
  await s.press("ENTER");

  if (!(await pressThrough(s, /primary option menu|\bREADY\b/i))) throw new Error("logon never reached ISPF or READY");
  if (/primary option menu/i.test(s.render({ mode: "full" }))) {
    enterCommand(s, "END");
    await s.press("ENTER");
    await pressThrough(s, /\bREADY\b/i, 4);
  }
  if (!/\bREADY\b/i.test(s.render({ mode: "full" }))) throw new Error("never reached TSO READY");
}
