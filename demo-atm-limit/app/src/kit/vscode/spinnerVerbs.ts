/**
 * Vocabulary for the in-flight status row's "<verb>…" (ChatPanel.tsx).
 * CLAUDE_CODE_VERBS is the real Claude Code CLI's own spinner wordlist,
 * verbatim; MAINFRAME_VERBS is this demo's own addition, invented for the
 * mainframe setting and never shown by the real product.
 */
export const CLAUDE_CODE_VERBS = [
  "Accomplishing",
  "Architecting",
  "Brewing",
  "Calculating",
  "Cerebrating",
  "Churning",
  "Clauding",
  "Cogitating",
  "Computing",
  "Crunching",
  "Deciphering",
  "Deliberating",
  "Elucidating",
  "Forging",
  "Hashing",
  "Inferring",
  "Marinating",
  "Mulling",
  "Musing",
  "Noodling",
  "Percolating",
  "Perusing",
  "Pondering",
  "Processing",
  "Reticulating",
  "Ruminating",
];

export const MAINFRAME_VERBS = [
  "IPLing",
  "Spooling",
  "Cataloging",
  "Allocating",
  "Link-editing",
  "Dispatching",
  "Paging",
  "Quiescing",
  "Punching cards",
  "Mounting tapes",
  "Varying online",
  "Reading the listing",
];

/** The demo owner's own additions — like MAINFRAME_VERBS, never shown by the real Claude Code CLI. */
export const OWNER_VERBS = ["Databasing", "Analyzing", "Accelerating"];

export const SPINNER_VERBS: string[] = [...CLAUDE_CODE_VERBS, ...MAINFRAME_VERBS, ...OWNER_VERBS];

/** Claude Code's own spinner glyph cycle. */
export const SPINNER_GLYPHS = ["·", "✢", "✳", "✶", "✻", "✽"];
