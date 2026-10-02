/**
 * The architecture strip's boxes (kit/diagrams/ComponentsStrip.tsx): the
 * path a debit takes, left to right — FACTS.md's own "Component chain".
 */
import type { ComponentBox } from "../../kit/engine/content";

export const COMPONENTS: ComponentBox[] = [
  { id: "atm", label: "ATM", sub: "HB.js client" },
  { id: "hbjs", label: "HB.js", sub: "HostBridge JavaScript Engine" },
  { id: "cics", label: "CICS region", sub: "" },
  { id: "dot500", label: "DOT500", sub: "transaction in COBOL" },
  { id: "dot200", label: "DOT200", sub: "COBOL module" },
  { id: "dotfile", label: "DOTFILE", sub: "VSAM" },
];
