# manual1 — status (2026-09-25)
## 1. Status
`scripts/manual-path.ts` was built end to end but never completed a timed run:
`setup()` cannot reliably create the two scratch members in `HERC02.DOGECICS`.
IND$FILE PUT to a brand-new member failed on the FIRST attempt (host said
`IND$FILE ENDED DUE TO ERROR`; tried with `lrecl:80` and with no options at
all). REVEDIT creation worked once, then failed on every one of ~20 later
create/delete cycles this session. **Hypothesis, not confirmed**:
`HERC02.DOGECICS` (`FB 80 BLKSIZE 19040 DSORG PO`, `TRK(30,10,13)` = 13
directory blocks) is out of directory space — `LISTDS 'HERC02.DOGECICS'
MEMBERS` shows 20 members now, but PDS `DELETE` doesn't reclaim a directory
block without a COMPRESS, and this session ran ~15-20 create/delete cycles.
## 2. REVEDIT facts measured live
- `I<n>` doesn't auto-scroll: `I15` with 2 rows headroom opened exactly 2
  prompts, not 15; with 0 rows headroom it opened 0.
- TOP/BOTTOM OF DATA's banner text is not in `session.fields()` at all — only
  its 6-asterisk prefix field is a real field.
- Re-opening a not-yet-saved member can show a `****ZAP****AUTOSAVE**********`
  recovery banner on that boundary line.
- `REVEDIT INVALID ON THIS LINE` needs ENTER (dismiss) before PF3; 8 bare PF3s
  alone never escaped it — CANCEL is the next escalation.
- A retry loop's `pressThrough(/REVEDIT/i)` is satisfied by the STALE
  `REVEDIT INVALID ON THIS LINE` text itself, so a naive retry "reopens"
  without ever actually reopening.
## 3. Rerun
`npx tsx examples/demo-atm-limit/scripts/manual-path.ts > examples/demo-atm-limit/captures/manual1/manual-path.txt 2>&1; echo EXIT=$?`
Needs `HERC02.DOGECICS` to have free PDS directory space (COMPRESS or a larger
reallocation) so a brand-new member can be created — by IND$FILE PUT, or by
REVEDIT consistently opening real insert prompts instead of the ZAP/AUTOSAVE-
blocked boundary.
