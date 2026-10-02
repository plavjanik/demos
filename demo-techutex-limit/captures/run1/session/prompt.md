# Ticket (as run)

Reject a debit if the customer's accumulated debit total for the day would
exceed a configured ceiling.

Today the DOT online "Account Transaction" screen (transaction DOT5) accepts
any valid debit. Add a configured ceiling (default $5,000.00) and reject a
debit when (amount already debited + this debit) would go over it.

Source: `ais-cam-dot/workshop/daily-transaction-limit.md` in the
`cobol-cowboys` repo (the same change this demo's workshop teaches by hand;
this run drives it with an agent instead).
