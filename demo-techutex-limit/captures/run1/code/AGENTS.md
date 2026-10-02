<!--
  AGENTS.md gives an AI agent the facts about this codebase up front, so
  it does not have to rediscover them for every request and the developer
  does not have to repeat them in every prompt.
-->

# BANKING/DOT — working notes for an AI assistant

## Code map

- `DOT500` (transaction `DOT5`) posts a debit or credit; every posting rule
  lives here.
- `DOT200` is a shared service — request `DOT-RETURN-HEADER` — that reads an
  account's running totals; `DOT400` already calls it the same way a new
  caller should.
- `DOTFILE` is the VSAM file behind DOT200/DOT500. Copybooks live in
  `COBCOPY` (`DOTCONS`, `DOTCOMM`, `DOTRECD`, ...).

## Endevor

`DEV/1/BANKING/DOT`, types `COBPGM` (programs), `COBCOPY` (copybooks), `JS`
(HostBridge JavaScript Engine (HB.js) tests), `MD` (notes — this file). Generate = the element's own
processor group. Deploy = submit the DEPLOY JCL from the deploy data set
(a Zowe MCP job submission, not a local step).

## Tests

Tests are the `JS` elements in `BANKING/DOT` — `DOTREGRT` pins existing
behaviour. Run any of them with `hb script run <name>`. Add a new test as a
new `JS` element.

## Compiler

Enterprise COBOL, fixed source format: columns 8-72, Area A (8-11) vs Area B
(12-72) — a `01` level or paragraph name must start in Area A, and a `COPY`
statement must not collide with column 7.
