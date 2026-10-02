Our Doge ATM (examples/demo-atm-limit/atm) talks to the DOGECICS application on the mainframe
through Panelwright. It has no daily withdrawal limit — anyone can drain an account in one day.

Add a daily limit of 10,000 DOGE per day to the CICS application (COBOL sources are in cobol/,
compile JCL in jcl/, the host is tk5probe, PDS HERC02.DOGECICS). Work test-first:
1. First write vitest tests in test/atm.test.ts that pin the EXISTING behaviour (balance, recent
   transactions, invalid address rejection, a normal send) so we can prove nothing regresses.
2. Then add tests for the limit: a withdrawal over the limit is refused with a clear message, one
   under the limit still works, amounts with decimals work, and the limit is cumulative across
   withdrawals. Run them — they must fail because the feature is missing.
3. Find where sends are handled, show me your plan, then implement it, upload and compile on the
   host with the Panelwright CLI, and run the tests until they are green.
Keep the change to DOGESEND if you can. Don't touch the BMS maps.
