# Proposed HB.js MCP tool shapes (invented -- no HB.js MCP server exists yet)

Derived directly from the real `hb` CLI verbs in
`ais-cam-dot/hostBridge/hb-cli` (built and used live this session, see
`hb-log.txt`). A future `hbjs-mcp` server would plausibly expose:

| tool | maps to | args | returns |
|---|---|---|---|
| `hbScriptDeploy` | `hb script deploy <file> [--update]` | `{name, source, update?}` | `{success, name, httpStatus}` |
| `hbScriptRun` | `hb script run <name> [k=v...]` | `{name, params?}` | the script's JSON/text response verbatim |
| `hbScriptList` | `hb script list [--repo]` | `{repo?}` | `[{name, type, updated, ...}]` |
| `hbEnv` | `hb env` | `{}` | `{host, port, user}` (password never returned) |

Everything the demo shows as an "HB.js MCP call" is one of these four, built
from what `hb`/the raw HTTP API actually did in this run -- see
`hb-log.txt` for the literal commands and `code/js/postDebit.js`,
`code/js/getCheckingBalances.js`, `code/js/dot.dailyLimit.test.js`,
`code/js/dot.regression.test.js` for what they ran.
