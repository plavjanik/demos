# Facts sheet

- **Application / region**: `cobol-cowboys` repo, `ais-cam-dot` (AIS/CAM/DOT
  banking demo apps). Program `DOT500` (transaction `DOT5`), map `DOT500M`/
  `ACCTTRX`, region `CICSTEST` on LPAR `testsys.broadcom.net`.
  Endevor path: `DEV/1/BANKING/DOT/COBPGM/DOT500` (mock EWS server, datasource
  `COWBOYS`, `http://localhost:8080/EndevorService/api/v2`). These names are
  already public in the OSS `cobol-cowboys`/`code4z-gen-ai` repos -- no
  replacement needed for a public demo.
- **The ticket, in one sentence**: reject a debit if the account's
  accumulated debit total for the day would exceed a configured $5,000.00
  ceiling.
- **Host messages**: before = `TRANSACTION INSERTED SUCCESSFULLY`; after
  (over ceiling) = `ERROR: DAILY DEBIT LIMIT EXCEEDED` /
  `CORRECT AND RE-ENTER INPUT FIELD`.
- **What the client (HB.js test) shows**: JSON `{test, status: ACCEPTED|
  REJECTED, screen:{errorMessage,userMessage}}` from `postDebit.js`, and
  `{status, accountInfo:{customerName: "WILLIAMS ROBT", ...}, primaryBalances,
  activityDetail:{withdrawals,...}}` from `getCheckingBalances.js`. Demo
  account: bank `001`, type `DD`, key `DEMO`→`101123456`.
- **Component chain**: HB.js client script -> HTTP `hbutils`/`hbscript` API
  on CICSTEST (port 2020) -> HB.js virtual-terminal driving transaction
  `DOT5` -> program `DOT500` -> `EXEC CICS LINK` to `DOT200` (`RETURN-HEADER`)
  -> `DOTFILE` VSAM.
- **Known simplification, not a bug**: the change (and the workshop it
  mirrors) passes `WS-CUTOFF-DATE` (a fixed sentinel, `19000101`) as the
  cutoff, not "yesterday." That makes this a **lifetime** accumulated-debit
  ceiling, not a strict daily one, even though the messaging says "daily." A
  true daily version would need to compute yesterday's date and pass it with
  `DOT-AFTER-CUTOFF`. Not fixed here -- this run intentionally reproduces the
  workshop's own shipped answer key verbatim.
- **Model / tooling**: Claude Sonnet 5, Claude Code CLI (no VS Code
  extension in this run -- headless CLI session, see below), permission mode
  default with per-tool approvals as configured in
  `.claude/settings.local.json`.

## What's real vs what's faked/invented in this archive

**Real, actually happened this run:**
- The Endevor MCP calls (`get_map`, `get_elements`, `get_element_content`)
  against a real, running mock EWS server (`code4z-gen-ai`'s
  `mock_ews_server`, datasource `COWBOYS`) that mirrors this repo's DOT
  elements 1:1 (confirmed: DOT500 element metadata + source retrieved from
  it matches the local file).
- The three-line-of-COBOL code change to `DOT500`, edited directly in the
  local workspace (this Endevor mock has no update/generate tool -- see
  below).
- Two real compile failures and one real success, via `syncz task
  build:dot` -> `bldz`/`IGYCRCTL` on the actual z/OS LPAR (`listings/
  generate-1/2/3-DOT500-build.txt`). Both failures were genuine fixed-format
  COBOL column mistakes made while typing the change by hand (an `01` level
  not starting in Area A; a `COPY` statement's continuation losing its
  sequence-number padding and colliding with column 7) -- not manufactured.
- A real deploy (`syncz task deploy`) to the live `CICSTEST` region:
  `USER.CICS.BIZAPP.DOT.LOAD(DOT500)` + `CEMT SET PROG(DOT500)
  PHASEIN`, no region restart.
- Four real HB.js test runs against the live region (`tests/run-1..4-*.txt`):
  regression green before, new test red before, new test green after,
  regression still green after.

**Invented / to be faked in the built demo:**
- **The Endevor "update element" and "generate" tools.** This MCP server
  (`code4z-cowboys`) only exposes read/search tools today -- no
  add/update/generate. Per the brief, the demo should render these as if
  they existed. `session/mcp/endevor-tools.json` and `endevor-calls.jsonl`
  give the invented shapes and payloads; their actual *content* (the
  listings, the return codes, the before/after source) is 100% real, taken
  from the genuine `syncz`/`bldz` compile+deploy above. Say this explicitly
  in the demo: "Endevor MCP update/generate tools shown here are proposed,
  not yet built; the compile output itself is real."
- **The HB.js MCP server.** Doesn't exist; this run drove HB.js through the
  `hb` CLI (`ais-cam-dot/hostBridge/hb-cli`, built in an earlier session)
  and raw `hbutils`/`hbscript` HTTP calls. `session/mcp/hb-mcp-proposal.md`
  gives tool-name/argument-shape proposals derived directly from `hb`'s
  actual verbs.
- **COBOL Language Support / COBOL LS.** Not exercised -- this was a
  headless CLI session, no VS Code extension running. The two real compile
  failures above are exactly the kind of mistake COBOL LS's live diagnostics
  would have caught before ever running `syncz` (per
  `ais-cam-dot/workshop/daily-transaction-limit.md`'s own callout about
  column-72/area-A mistakes). Say so in the demo rather than staging a fake
  editor.

## What did NOT happen (so the demo doesn't pretend it did)

- No VS Code / Claude Code extension UI was involved -- no permission-prompt
  screenshots, no panel screenshots (`ui/` is empty in this archive).
  `COLLECTING.md` section 8 needs a separate capture pass from someone
  running the real extension.
- 3270 screens (`screens/01-05`) were added in a second pass the same day,
  via a real Panelwright session against a live personal TPX USERSESSION on
  `CICSTEST`, USER -- not the headless HB.js JSON path the workshop doc
  itself verifies with. Screen 03 (rejected) is on the *currently deployed*
  post-change `DOT500` (the same v2 load module from the first pass, still
  live); there is no v0/v1 load module deployed anywhere to re-run screen 04
  (accepted) against, so 04 uses the "account under $5,000" option instead
  -- account `901123456`, $0.00 withdrawn today -- not the "v0 program"
  option. See `MANIFEST.md` for the full screen-by-screen breakdown.
- No manual-mechanics timing baseline (`manual/mechanics.jsonl` not
  populated) -- nobody was timed doing this change by hand in this run, and
  none was requested; the demo adapts the DOGECICS manual-path estimate
  instead, labelled as an estimate.
- The demo account (`101123456`) is a long-lived, shared, heavily-reused
  test account -- its accumulated "withdrawals today" figure
  ($10,014 -> $10,114 across this run) was already far past $5,000 before
  this run started, from earlier sessions' testing today. That's why the new
  test uses a modest $50 debit and still gets rejected after the change --
  it isn't a specially crafted boundary case.
