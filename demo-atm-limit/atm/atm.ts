/**
 * A small ATM front end for DOGECICS, a demo CICS/KICKS COBOL application
 * running on a real IBM mainframe (MVS 3.8, KICKS for TSO). Demonstrates
 * Panelwright's `@panelwright/core` Session API against a genuine 3270 host:
 * TSO logon, an unformatted transaction-entry screen, and ordinary formatted
 * BMS-map fields addressed by their on-screen labels rather than coordinates.
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { connect } from "@panelwright/core";
import type { Session } from "@panelwright/core";
import { enterCommand, pressThrough, rowText, tsoLogon } from "./screen.js";

export interface AtmOptions {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}

export interface Withdrawal {
  accepted: boolean;
  /** The send screen's status line (row 18), trimmed. */
  message: string;
}

export interface Transaction {
  date: string;
  label: string;
  sign: "+" | "-";
  amount: string;
}

/** The recipient the ATM pays out to (override with ATM_RECIPIENT); DOGESEND rejects only its own placeholder text. */
const DEFAULT_TO_ADDRESS = process.env["ATM_RECIPIENT"] ?? "Petr Plavjanik";

export class Atm {
  private captureDir = process.env["ATM_CAPTURE_DIR"];
  private captureSeq = 0;

  private constructor(private readonly session: Session) {}

  static async open(opts: AtmOptions = {}): Promise<Atm> {
    const host = opts.host ?? process.env["TK5_HOST"] ?? "localhost";
    const port = opts.port ?? Number(process.env["TK5_PORT"] ?? 3271);
    const user = opts.user ?? process.env["TK5_USER"] ?? "HERC02";
    const password = opts.password ?? process.env["TK5_PASS"] ?? "CUL8TR";

    const atm = new Atm(await connect({ host, port }));
    try {
      await tsoLogon(atm.session, user, password);
      await atm.startDoge();
      return atm;
    } catch (err) {
      await atm.close().catch(() => {});
      throw err;
    }
  }

  /** The "Available" balance on the main menu, e.g. "87,654,321.12345678". */
  balance(): string {
    const match = /Available\s*:\s*([\d,]+\.\d{8})/i.exec(this.session.render({ mode: "full" }));
    if (!match) throw new Error("balance not found on the main menu");
    return match[1]!;
  }

  async withdraw(amount: string, toAddress = DEFAULT_TO_ADDRESS): Promise<Withdrawal> {
    const s = this.session;
    const screen = s.render({ mode: "full" });
    if (/Available/i.test(screen)) {
      s.type({ after: "Option:" }, "S");
      await s.press("ENTER");
      if (!(await pressThrough(s, /pay\s*to/i, 4))) throw new Error("send form never painted");
    } else if (!/pay\s*to/i.test(screen)) {
      throw new Error("withdraw(): not on the main menu or the send form");
    }
    await this.capture("send-form");
    // "pay" and "to" are two adjacent BMS literals, each its own protected
    // field — a label locator can't merge across "to"'s own attribute byte,
    // so `after: "to"` (skipping the protected ":" in between) finds PAYTO.
    s.type({ after: "to" }, toAddress);
    s.type({ after: "amount" }, amount);
    await s.press("ENTER");
    await this.capture("send-result");
    // SNDMSG (DOGESMAP row 18 col 19 len 42): the host's own status line. BMS
    // POS names the ATTRIBUTE byte's column, one cell before the data, so
    // the 0-based data column equals the BMS column number unchanged.
    const message = rowText(s, 17).slice(19, 61).trim();
    return { accepted: message.startsWith("SENDING"), message };
  }

  /** The two most recent transactions the main menu paints (RECNT1/RECNT2). */
  async recentTransactions(): Promise<Transaction[]> {
    const s = this.session;
    if (!/Available/i.test(s.render({ mode: "full" }))) {
      // DOGESEND's PARSE-INPUT: Option 'W' returns to the main menu.
      s.type({ after: "Option:" }, "W");
      await s.press("ENTER");
      if (!(await pressThrough(s, /Available/i, 4))) throw new Error("main menu never painted");
    }
    // RECNT1 (row 22) then RECNT2 (row 23), each a 47-char DISPLAY-TRAN group
    // at col 3: date(10) sp label(10) sp sign(1) amount(19) sp type(4).
    return [21, 22]
      .map((row) => rowText(s, row).slice(3, 50))
      .map(parseTransactionRow)
      .filter((t): t is Transaction => t !== null);
  }

  async close(): Promise<void> {
    const s = this.session;
    try {
      // DOGE's own PF3 convention walks any inner screen back to QUIT.
      for (let i = 0; i < 4 && !/DOGE HAS EXITED/i.test(s.render({ mode: "full" })); i++) {
        await s.press("PF3");
      }
      await this.capture("quit");
      await s.press("CLEAR"); // QUIT's own repaint
      await s.press("CLEAR"); // blank transaction-entry screen
      s.typeRaw("KSSF");
      await s.press("ENTER");
      await pressThrough(s, /\bREADY\b/i, 6);
      enterCommand(s, "LOGOFF");
      await s.press("ENTER");
      await pressThrough(s, /Logon\s*===>|Terminal\s+CUU/i, 5);
    } finally {
      s.close();
    }
  }

  // ---- internals -----------------------------------------------------

  private async startDoge(): Promise<void> {
    const s = this.session;
    enterCommand(s, "EXEC 'HERC02.KICKSSYS.V1R5M0.CLIST(KICKS)' 'SIT(DO)'");
    await s.press("ENTER");
    if (!(await pressThrough(s, /KSGM for tso user/i, 10))) throw new Error("KICKS never painted the KSGM banner");

    await s.press("CLEAR"); // banner repaint (colors re-roll)
    await s.press("CLEAR"); // blank, genuinely unformatted transaction-entry screen
    s.typeRaw("DOGE");
    await s.press("ENTER");
    if (!(await pressThrough(s, /MUCH COIN|PRESS F5 TO CONTINUE/i, 6))) throw new Error("DOGE splash never painted");
    await this.capture("splash");

    await s.press("PF5");
    if (!(await pressThrough(s, /Available/i, 6))) throw new Error("DOGE main menu never painted");
    await this.capture("main-menu");
  }

  /** Writes an SVG + a plain-text render for the recording pipeline; a no-op unless ATM_CAPTURE_DIR is set. */
  private async capture(name: string): Promise<void> {
    if (!this.captureDir) return;
    const n = String(++this.captureSeq).padStart(2, "0");
    await fs.mkdir(this.captureDir, { recursive: true });
    await fs.writeFile(path.join(this.captureDir, `${n}-${name}.svg`), this.session.renderSvg());
    await fs.writeFile(path.join(this.captureDir, `${n}-${name}.txt`), this.session.render({ mode: "full" }));
  }
}

/** DOGEMAIN's DISPLAY-TRAN layout; a blank date means that row has no transaction. */
function parseTransactionRow(raw: string): Transaction | null {
  const date = raw.slice(0, 10).trim();
  if (date === "") return null;
  return {
    date,
    label: raw.slice(11, 21).trim(),
    sign: raw.slice(22, 23) as "+" | "-",
    amount: raw.slice(23, 42).trim(),
  };
}
