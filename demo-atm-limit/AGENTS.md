# DOGECICS — working notes for an AI assistant

DOGECICS is a small CICS application (COBOL + BMS maps) running under KICKS
on an MVS host. The Doge ATM in `atm/` talks to it through Panelwright over
TN3270. You have the same tools a developer has here: the sources, the host,
the compile job and the tests. Use them in that order.

## The code

- `cobol/DOGEMAIN.cbl` — main menu: balance and recent transactions from the
  VSAM file `DOGEVSAM`; routes to the other programs with `XCTL`.
- `cobol/DOGESEND.cbl` — the send (withdrawal) transaction `DSND`: receives
  the `DOGESN` map, writes a spool record. Every rule about a send lives here.
- `bms/DOGESMAP.bms` — the send screen (`pay to`, `amount`, status line
  `SNDMSG`, 42 characters). Do not change maps unless the task says so; a
  map change needs `COMPMAPS` as well.
- `jcl/COMPSEND.jcl` compiles and links `DOGESEND` alone; `COMPCOBL.jcl` is
  the whole application. The compiler is OS/VS COBOL (1974 dialect): no
  `END-IF`, no `UNSTRING`/`INSPECT`/intrinsic functions; use `EXAMINE`,
  subscripted tables and periods. Columns 8–72.

## The host

`tk5probe` on `localhost:3271`, user `HERC02` (password in the team's
notes). Sources live in the PDS `HERC02.DOGECICS`. Everything goes through
the Panelwright CLI:

```sh
panelwright connect localhost:3271                # then log on as HERC02, END out of ISPF to READY
panelwright transfer put "'HERC02.DOGECICS(DOGESEND)'" cobol/DOGESEND.cbl --lrecl 80
panelwright tso "SUBMIT 'HERC02.DOGECICS(COMPSEND)'"
panelwright tso "STATUS DOGECOB"                  # until ON OUTPUT QUEUE
panelwright tso "OUTPUT DOGECOB(JOBnnnnn) PRINT(JOBnnnnn) KEEP"
panelwright transfer get "'HERC02.JOBnnnnn.OUTLIST'" job.outlist   # grep IEF142I for COND CODE, IKF for diagnostics
```

Log off to the `Logon ===>` splash before you disconnect; a dropped
session strands HERC02 until the container is restarted. Only one session
may use HERC02 at a time — the tests open their own.

## The tests

`npx vitest run` in this directory runs the live suites against the host:
`test/atm.regression.test.ts` pins the existing behaviour, `test/
atm.limit.test.ts` the daily limit. Each run takes ~26 s and spends ~1,100
DOGE of the day's allowance; `jcl/RESEED.jcl` restores the seed data.
Write the test before the change, watch it fail for the right reason, then
change the COBOL, compile, and run everything again.
