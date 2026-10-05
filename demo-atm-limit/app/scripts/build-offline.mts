/**
 * Builds each demo page as ONE self-contained .html file (dist/offline/<page>-offline.html)
 * that opens from disk with no network (and carries `data-offline-copy` on <html>, which hides the app's
 * own download links — see src/kit/engine/offlineCopy.ts): every script, stylesheet, font and image is inlined.
 *
 * It is a plain file-to-file transformation of Vite's own output, built once per page into
 * dist-offline/ (never dist/). Load-bearing rules: Vite inlines what it processes
 * (assetsInlineLimit), but fonts under public/ are copied, not processed, so their url()s are
 * rewritten here; the build FAILS if any non-data url( or http(s) URL survives.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { build, type InlineConfig } from "vite";
import { markOfflineCopy } from "../src/kit/engine/offlineCopy";

const root = path.resolve(import.meta.dirname, "..");
const scratch = path.join(root, "dist-offline");
const outDir = path.join(root, "dist", "offline");
const publicDir = path.join(root, "public");
const PAGES = ["techutex", "techutex-variants", "dogecics"];

const MIME: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function fail(msg: string): never {
  console.error(`build-offline: ${msg}`);
  process.exit(1);
}

function publicDataUri(ref: string, page: string): string {
  const rel = ref.replace(/^(\.\/|\.\.\/|\/)+/, "");
  const file = path.join(publicDir, rel);
  const mime = MIME[path.extname(file)];
  if (!fs.existsSync(file) || !mime) fail(`${page}: url(${ref}) is not a data URI and not a file in public/`);
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

function transform(page: string, dir: string): string {
  const read = (ref: string) => fs.readFileSync(path.join(dir, ref.replace(/^(\.\/|\/)+/, "")), "utf8");
  let html = read(`${page}.html`);
  html = html.replace(/[ \t]*<link\b[^>]*rel="modulepreload"[^>]*>\n?/g, "");
  const scripts: string[] = [];
  html = html.replace(/[ \t]*<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>\n?/g, (_m, src: string) => {
    scripts.push(
      read(src)
        .replace(/<\/script/gi, "<\\/script")
        .replace(/<!--/g, "<\\!--"),
    );
    return "";
  });
  html = html.replace(
    /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>|<link\b[^>]*href="([^"]+)"[^>]*rel="stylesheet"[^>]*>/g,
    (_m, a?: string, b?: string) => {
      const css = read((a ?? b)!)
        .replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/g, (u, _q, ref: string) =>
          ref.startsWith("data:") ? u : /^https?:/i.test(ref) ? u : `url("${publicDataUri(ref, page)}")`,
        )
        .replace(/<\/style/gi, "<\\/style");
      return `<style>${css}</style>`;
    },
  );
  // Module scripts go last in <body> so the DOM exists; deferred semantics are kept by type=module anyway.
  html = html.replace(
    "</body>",
    () => scripts.map((s) => `<script type="module">${s}</script>\n`).join("") + "</body>",
  );
  return html;
}

function verify(page: string, html: string): void {
  const bad: string[] = [];
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>)\\]+/g)) bad.push(m[0]);
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n");
  const urls = [...styles.matchAll(/url\(\s*(["']?)([^)"']*)\1\s*\)/g)]
    .map((m) => m[2]!)
    .filter((u) => !u.startsWith("data:") && !u.startsWith("#"));
  if (urls.length) fail(`${page}: non-data url( remains: ${[...new Set(urls)].join(", ")}`);
  const hrefs = [...html.matchAll(/<(?:link|script|img)\b[^>]*\b(?:src|href)="(?!data:|#)([^"]+)"/g)].map((m) => m[1]!);
  if (hrefs.length) fail(`${page}: external src/href remains: ${hrefs.join(", ")}`);
  if (bad.length) {
    // URLs inside the inlined bundles are mostly strings (docs links, SVG xmlns); list them all for review.
    const uniq = [...new Set(bad)];
    // Allowed: XML namespaces, React's error-decoder message text, the opt-in voice setting's default TTS endpoint (only fetched when
    // spoken narration is switched on) and the illustrative host names in the captured text.
    const allowed = (u: string) =>
      /^https:\/\/reactjs\.org\/docs\/error-decoder|^http:\/\/(www\.w3\.org\/|localhost:8085$|host:|&#x3C;host)/.test(
        u,
      );
    const rest = uniq.filter((u) => !allowed(u));
    if (rest.length) fail(`${page}: http(s) URLs found: ${rest.join(" ")}`);
  }
}

fs.rmSync(scratch, { recursive: true, force: true });
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const page of PAGES) {
  const dir = path.join(scratch, page);
  const config: InlineConfig = {
    root,
    logLevel: "warn",
    build: {
      outDir: dir,
      emptyOutDir: false,
      cssCodeSplit: false,
      assetsInlineLimit: () => true,
      modulePreload: false,
      chunkSizeWarningLimit: 100000,
      rollupOptions: {
        input: path.join(root, `${page}.html`),
        output: { inlineDynamicImports: true },
      },
    },
  };
  await build(config);
  const html = markOfflineCopy(transform(page, dir));
  verify(page, html);
  const out = path.join(outDir, `${page}-offline.html`);
  fs.writeFileSync(out, html);
  console.log(`offline: ${path.relative(root, out)} ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
}
