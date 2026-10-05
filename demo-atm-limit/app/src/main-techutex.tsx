import { createRoot } from "react-dom/client";
import "@vscode/codicons/dist/codicon.css";
import "./styles/global.css";
import { DemoApp } from "./DemoApp";
import { STEPS, CONTENT } from "./demos/techutex";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

// No StrictMode — see main.tsx's comment.
createRoot(root).render(<DemoApp steps={STEPS} content={CONTENT} demoId="techutex" narrationId="techutex" />);
