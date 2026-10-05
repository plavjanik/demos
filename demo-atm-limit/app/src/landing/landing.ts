/**
 * Entry for index.html, the landing page that links every demo. Static markup;
 * this module only pulls in the shared fonts/tokens, the page's own CSS, and
 * the Techutex brand logo so Vite bundles it.
 */
import "../styles/global.css";
import "./landing.css";
import logoUrl from "../../../../demo-techutex-limit/brand/broadcom-mainframe-software.png";

for (const logo of document.querySelectorAll("img.brand-logo")) {
  if (logo instanceof HTMLImageElement) logo.src = logoUrl;
}
