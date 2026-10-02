# Plan (as executed)

1. Confirm the existing regression coverage for basic transaction processing:
   `getCheckingBalances` (HB.js, already deployed). Run it — must stay green
   throughout, since it's orthogonal to the daily-limit rule.
2. Write a new test for the ticket (`dot.dailyLimit.test.js`, wraps the
   already-deployed `postDebit` HB.js script): post a modest debit and
   assert it comes back `REJECTED` with "LIMIT EXCEEDED". Run it now —
   expected RED, because the current DOT500 has no such rule.
3. Retrieve `DOT500` from Endevor (system BANKING, subsystem DOT, type
   COBPGM, environment DEV stage 1) to confirm the current source.
4. Make the change in `DOT500`: a rejection message, a ceiling + two work
   fields, and a `4100-CHECK-DAILY-LIMIT` section that reuses DOT200's
   existing `RETURN-HEADER` service the same way `DOT400` already does.
5. Update the element in Endevor and generate (compile+link). Fix and
   regenerate if it fails — keep every version and every listing.
6. Deploy to the running CICSTEST region.
7. Re-run both tests: regression must still be green, the new test must now
   be green (REJECTED).
