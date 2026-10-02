/**
 * The architecture strip's boxes (kit/diagrams/ComponentsStrip.tsx): the
 * path a withdrawal takes, left to right, from the Doge ATM through to the
 * VSAM file it never actually touches directly.
 */
import type { ComponentBox } from "../../kit/engine/content";

export const COMPONENTS: ComponentBox[] = [
  { id: "atm", label: "Doge ATM", sub: "TypeScript" },
  { id: "core", label: "Panelwright core", sub: "Session API" },
  { id: "tn3270", label: "TN3270", sub: "wire protocol" },
  { id: "kicks", label: "KICKS (CICS)", sub: "on MVS 3.8" },
  { id: "dogesend", label: "DOGESEND", sub: "COBOL" },
  { id: "vsam", label: "DOGEVSAM", sub: "KSDS" },
];
