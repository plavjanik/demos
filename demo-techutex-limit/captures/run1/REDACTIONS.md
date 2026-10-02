No redactions were needed in this archive:

- No password appears anywhere: `hb env`/`hb-log.txt` never print
  `HB_PASS`; the Endevor mock server's `USER`/`PASSWORD` credentials are
  already public test fixtures in the OSS `code4z-gen-ai` repo, not real
  secrets.
- The demo account number (`101123456`, customer "WILLIAMS ROBT") is a
  pre-existing public fixture in the OSS `cobol-cowboys` demo repo -- not
  real customer/production data. (The host name, userid, dataset names and
  CICS region of the lab system are replaced in this public copy -- see the
  last entry below.)
- Grepped this archive for the userid's literal password value,
  `id_rsa`, and `ZOWE_MCP_PASSWORD` -- none found.
- The added `session/claude-session.jsonl` (a slice of the Claude Code
  transcript, copied by the user) and the added `screens/`+`environment.txt`
  material were grepped again for the literal lab password values
  (two literal values, withheld here) before this archive was repackaged -- none found.
  Account `901123456` (used for the "accepted" screen) is the same kind of
  pre-existing public OSS test fixture as `101123456` above.

- Added on import into the panelwright repo (2026-09-25): the transcript
  carried an internal GitHub host name and the runner's home directory in
  every workspace path (1189 and 1168 occurrences); both were replaced
  (`github.internal`, `/Users/dev`) before the file was committed. Nothing
  the demo renders may show a workspace path at all — element names and
  repo-relative paths only.
  Three other internal host names that the session context (not the run)
  had pulled in were replaced the same way.

- Added when this archive moved to the public `demos` repository
  (2026-10-02). Three changes, and nothing else:
  1. `session/claude-session.jsonl` is withheld (see
     `session/claude-session.WITHHELD.md`).
  2. The paragraph above no longer names the password values it searched
     for.
  3. The lab system's identifiers are replaced with generic names in every
     file of the archive: host name -> `testsys.broadcom.net`, z/OS userid
     (also as job-name and dataset prefix) -> `USER`, the userid's home
     path -> `/u/users/USER/devops-ai-demo`, CICS region -> `CICSTEST`
     (dataset qualifier `CICS`). Line contents are otherwise untouched;
     return codes, message ids, line numbers and timings are as captured.
  The first line of this file ("No redactions were needed") describes the
  archive as delivered, before these.
