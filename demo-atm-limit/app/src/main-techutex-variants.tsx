import { createRoot } from "react-dom/client";
import "@vscode/codicons/dist/codicon.css";
import "./styles/global.css";
import { DemoApp } from "./DemoApp";
import { STEPS, CONTENT, CUTS } from "./demos/techutex";

// techutex-variants.html: the SAME Techutex story behind a cut chooser
// (Full / Medium / Short, src/demos/techutex/cuts.ts). techutex.html stays
// the plain Full demo with no chooser — the owner keeps that page intact
// and tries the cuts here.
const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

// No StrictMode — see main.tsx's comment.
const chooserHeadline = STEPS.find((s) => s.scene === "title")?.titleScene?.headline;

createRoot(root).render(
  <DemoApp
    steps={STEPS}
    cuts={CUTS}
    chooserHeadline={chooserHeadline}
    content={CONTENT}
    demoId="techutex"
    narrationId="techutex"
  />,
);
