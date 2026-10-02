import { createRoot } from "react-dom/client";
import "@vscode/codicons/dist/codicon.css";
import "./styles/global.css";
import { DemoApp } from "./DemoApp";
import { STEPS, CONTENT } from "./demos/dogecics";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

// No StrictMode: this is a one-off presentation app, not a library or a
// long-lived codebase, so its double-mount-in-dev safety net isn't worth
// the noise for what's otherwise a straightforward render tree.
// No demoId: this is the ORIGINAL demo — its review/narration localStorage
// keys stay the literal strings they always were (StepEngine.tsx).
// narrationId="dogecics": DemoApp.tsx's own manifest-folder/settings-key id
// for spoken narration — a new feature with no legacy key to preserve, so
// unlike demoId above this is always a real name.
createRoot(root).render(<DemoApp steps={STEPS} content={CONTENT} narrationId="dogecics" />);
