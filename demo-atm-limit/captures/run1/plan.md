# Plan: daily withdrawal limit in DOGESEND

Where: `cobol/DOGESEND.cbl`, paragraph `MOVE-SOME-DOGE` — the only place a send is
accepted. It moves the typed amount (`AMOUNTI`, PIC X(17)) straight into the spool record;
nothing is validated and nothing is written back to the VSAM file.

Design (one program, no map change):
1. Keep a **daily tracker record** in the existing `DOGEVSAM` KSDS (key 10, recl 80) under
   key `0000000000` — it sorts before every real record, so the balance read (key 1) and the
   history browse (from key 2) never see it. Layout mirrors the transaction record:
   date-of-total in the label column, running total in the amount column.
2. Today's date from `ASKTIME ABSTIME` + `FORMATTIME YYYYMMDD DATESEP('-')` (KICKS
   requires DATESEP). A tracker stamped with another day resets the total to zero.
3. Convert the typed amount to numeric: `UNSTRING` on `.`, right-align the integer part,
   zero-fill both parts with `INSPECT`, move to `PIC 9(8)V9(8)`.
4. `READ DOGEVSAM UPDATE` with `RESP`: `NOTFND` → start a fresh tracker (`WRITE`);
   otherwise `REWRITE` after adding the amount. If `total + amount > 10000` → refuse:
   `DAILY LIMIT 10000 DOGE EXCEEDED` in the status line, amount field highlighted, tracker
   left unchanged (`UNLOCK`), no spool record.
5. Accept path unchanged (`SENDING <amount> DOGE` + spool), so the existing tests hold.

Then: `transfer put` the member, submit a DOGESEND-only compile job (`jcl/COMPSEND.jcl`,
same job card and proc as `COMPCOBL`), read the job output for the return code, rerun tests.
