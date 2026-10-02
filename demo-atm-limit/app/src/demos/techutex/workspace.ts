/**
 * The "Explorer For Endevor" side bar — modelled on a real screenshot of
 * this exact inventory (captures/run1/ui/01-explorer-for-endevor.jpg):
 * three collapsible top-level sections (Endevor Elements expanded; Endevor
 * Element History and Endevor Packages collapsed, no content — this demo
 * never opens either), a service/datasource row, the `<*DEV/1/BANKING>`
 * search location, system BANKING, subsystems AIS/CAM (collapsed) and DOT
 * (expanded), and DOT's real element types/names from
 * captures/run1/code/endevor-inventory.txt +
 * captures/run1/session/mcp/endevor-calls.jsonl's get_map/get_elements
 * output. Every element name here through COBPGM is REAL (the mock EWS
 * server's own inventory). JS and MD are this DEMO's OWN invention — the
 * real inventory has neither type; see the comment at JS_TYPE/MD_TYPE below
 * before assuming either exists anywhere but this app.
 */
import type { TreeNode, ExplorerSection } from "../../kit/engine/content";

export const CODE_PATH: Record<string, string> = {
  "DOT500.v0.cbl": "DOT500",
  "DOT500.v1.cbl": "DOT500",
  "DOT500.v2.cbl": "DOT500",
  "DOT500.v1.diff": "DOT500",
  "DOT500.v2.diff": "DOT500",
  "dot.regression.test.js": "DOTREGRT",
  "dot.dailyLimit.test.js": "DOTDLIMT",
  "postDebit.js": "POSTDEBT",
  "getCheckingBalances.js": "GETCHKBL",
  "AGENTS.md": "AGENTS",
};

function element(name: string, codeKey?: string): TreeNode {
  return { name, path: `DOT/${name}`, kind: "file", icon: "list-flat", codeKey };
}

// Real, from endevor-inventory.txt / endevor-calls.jsonl's get_map+get_elements.
const COBCOPY: TreeNode[] = [
  "ATMCOMM",
  "ATMSCOMM",
  "ATMSLOGT",
  "CDSMSTR1",
  "DOTCOMM",
  "DOTCONS",
  "DOTRECD",
  "DOTUSER",
  "ODPCOMM",
  "ODPCONS",
  "TDA010D1",
].map((n) => element(n));

const COBPGM: TreeNode[] = ["DLACUSER", "DLDDUSER", "DLSSUSER", "DOT000", "DOT100", "DOT200", "DOT300", "DOT400"].map(
  (n) => element(n),
);
COBPGM.push(
  element("DOT500", "DOT500.v0.cbl"),
  element("DOT999"),
  element("DOTDDA"),
  element("DOTDUMP"),
  element("DOTPULL1"),
);

/**
 * INVENTED for this demo — real inventory has no JS or MD element types
 * under DOT (confirmed against the screenshot, which shows none). The demo
 * stages the HB.js test scripts and AGENTS.md as if Endevor already
 * versioned them, per the brief; say so out loud rather than pretending
 * these two types are real.
 */
const JS: TreeNode[] = [
  element("DOTREGRT", "dot.regression.test.js"),
  element("DOTDLIMT", "dot.dailyLimit.test.js"),
  element("POSTDEBT", "postDebit.js"),
  element("GETCHKBL", "getCheckingBalances.js"),
];
const MD: TreeNode[] = [element("AGENTS", "AGENTS.md")];

export const EXPLORER_SECTIONS: ExplorerSection[] = [
  {
    title: "Endevor Elements",
    tree: [
      {
        name: "localhost:8080/COWBOYS",
        path: "svc",
        kind: "dir",
        icon: "plug",
        children: [
          {
            name: "<*DEV/1/BANKING>",
            path: "svc/search",
            kind: "dir",
            children: [
              {
                name: "BANKING",
                path: "svc/search/BANKING",
                kind: "dir",
                children: [
                  { name: "AIS", path: "svc/search/BANKING/AIS", kind: "dir", collapsed: true, children: [] },
                  { name: "CAM", path: "svc/search/BANKING/CAM", kind: "dir", collapsed: true, children: [] },
                  {
                    name: "DOT",
                    path: "svc/search/BANKING/DOT",
                    kind: "dir",
                    children: [
                      { name: "ASMMAC", path: "DOT/ASMMAC", kind: "dir", collapsed: true, children: [] },
                      { name: "CICSMAP", path: "DOT/CICSMAP", kind: "dir", collapsed: true, children: [] },
                      { name: "COBCOPY", path: "DOT/COBCOPY", kind: "dir", children: COBCOPY },
                      { name: "COBPGM", path: "DOT/COBPGM", kind: "dir", children: COBPGM },
                      { name: "JS", path: "DOT/JS", kind: "dir", children: JS },
                      { name: "MD", path: "DOT/MD", kind: "dir", children: MD },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { title: "Endevor Element History", collapsed: true },
  { title: "Endevor Packages", collapsed: true },
];
