/**
 * Pre-renders one demo's narration to mp3, so the published (https, GitHub
 * Pages) site can play spoken narration without a local TTS server —
 * kit/engine/narrationAudio.tsx's "rendered" source plays back exactly what
 * this writes. Computes each step's speech text with the SAME function the
 * kit uses at runtime (speechText.ts's `speechTextForStep`), so a rendered
 * file's `textHash` only ever disagrees with a live viewer's effective text
 * when the narration was genuinely edited since the last render.
 *
 * Usage (run `npm run prerender` FIRST — STEPS lives in src/demos/<demo>/
 * steps.ts, which imports src/generated/<demo>/captures.ts, a build-time
 * artefact this script does not create):
 *
 *   npx tsx scripts/render-narration.mts --demo techutex --voice tata \
 *     --tts http://localhost:8085 --shape xtts [--only stepId,stepId] [--force]
 *
 * Requires `ffmpeg`/`ffprobe` on PATH (wav/mp3 -> a normalized mono 24 kHz
 * mp3, and reading back its duration for the manifest).
 *
 * Loads `steps.ts` through Vite's own SSR module API (`createServer` +
 * `ssrLoadModule`, middleware-mode — no port opened) rather than a plain
 * dynamic import: a demo's steps.ts pulls in its own config.ts, which for
 * Techutex imports a brand logo PNG (`import logoUrl from "*.png"`) — a
 * perfectly normal Vite asset import (transformed to a URL string) that a
 * bare Node/tsx import chokes on (`ERR_UNKNOWN_FILE_EXTENSION`). Vite's
 * loader already knows how to turn that into a plain string without ever
 * needing the actual devserver this script never starts.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { speechTextForStep } from "../src/kit/engine/speechText.ts";
import { buildTtsRequestBody, ttsSpeechEndpoint, type TtsShape } from "../src/kit/engine/ttsRequest.ts";
import type { NarrationManifest, NarrationManifestEntry } from "../src/kit/engine/narrationManifest.ts";
import type { Step } from "../src/kit/engine/types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, "..");

const KNOWN_DEMOS = ["dogecics", "techutex"] as const;
type DemoName = (typeof KNOWN_DEMOS)[number];

interface Args {
  demo: DemoName;
  voice: string;
  tts: string;
  shape: TtsShape;
  out: string;
  only: Set<string> | null;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) continue;
    const name = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values[name] = next;
      i++;
    } else {
      flags.add(name);
    }
  }

  const demo = values.demo;
  if (!demo || !KNOWN_DEMOS.includes(demo as DemoName)) {
    throw new Error(`--demo must be one of ${KNOWN_DEMOS.join(", ")} (got ${JSON.stringify(demo)})`);
  }
  const shape = (values.shape ?? "xtts") as TtsShape;
  if (shape !== "xtts" && shape !== "openai") throw new Error(`--shape must be "xtts" or "openai" (got ${shape})`);

  return {
    demo: demo as DemoName,
    voice: values.voice ?? "tata",
    tts: values.tts ?? "http://localhost:8085",
    shape,
    out: values.out ? path.resolve(APP_ROOT, values.out) : path.join(APP_ROOT, "public", "narration", demo),
    only: values.only ? new Set(values.only.split(",").map((s) => s.trim())) : null,
    force: flags.has("force"),
  };
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function readManifest(file: string): NarrationManifest {
  if (!existsSync(file)) return [];
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as NarrationManifest) : [];
  } catch {
    return [];
  }
}

function ffprobeDurationMs(file: string): number {
  const out = execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ])
    .toString()
    .trim();
  return Math.round(parseFloat(out) * 1000);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.out, { recursive: true });

  const viteServer = await createServer({ root: APP_ROOT, server: { middlewareMode: true }, appType: "custom" });
  let steps: Step[];
  try {
    const mod = (await viteServer.ssrLoadModule(`/src/demos/${args.demo}/steps.ts`)) as { STEPS: Step[] };
    steps = mod.STEPS;
  } catch (e) {
    throw new Error(
      `Failed to load ${args.demo}'s steps.ts — did you run "npm run prerender" first? (it imports src/generated/${args.demo}/captures.ts, which only exists after prerendering)\n${e instanceof Error ? e.stack : e}`,
    );
  } finally {
    await viteServer.close();
  }

  const manifestFile = path.join(args.out, "manifest.json");
  const manifest = readManifest(manifestFile);
  const manifestByKey = new Map<string, NarrationManifestEntry>(manifest.map((e) => [`${e.stepId}:${e.phase}`, e]));

  const selected = args.only ? steps.filter((s) => args.only!.has(s.id)) : steps;
  if (args.only) {
    const missing = [...args.only].filter((id) => !steps.some((s) => s.id === id));
    if (missing.length) console.warn(`--only named ${missing.length} step id(s) not found: ${missing.join(", ")}`);
  }

  let rendered = 0;
  let skipped = 0;

  for (const step of selected) {
    for (const phase of ["narration", "narrationAfter"] as const) {
      const shipped = step[phase];
      if (shipped === undefined) continue;
      const override = phase === "narration" ? step.narrationSpeech : step.narrationAfterSpeech;
      const text = speechTextForStep(shipped, override);
      if (!text) continue;

      const key = `${step.id}:${phase}`;
      const fileName = phase === "narration" ? `${step.id}.mp3` : `${step.id}.after.mp3`;
      const outFile = path.join(args.out, fileName);
      const textHash = sha256Hex(text);
      const existing = manifestByKey.get(key);

      if (!args.force && existing?.textHash === textHash && existsSync(outFile)) {
        console.log(`${key}  skip (unchanged)`);
        skipped++;
        continue;
      }

      const started = Date.now();
      const res = await fetch(ttsSpeechEndpoint(args.tts), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTtsRequestBody(args.shape, { input: text, voice: args.voice, language: "en" })),
      });
      if (!res.ok) throw new Error(`${key}: TTS server responded ${res.status} ${res.statusText}`);
      const contentType = res.headers.get("content-type") ?? "";
      const rawExt = contentType.includes("wav") ? "wav" : contentType.includes("mpeg") ? "mp3" : "bin";
      const rawFile = path.join(args.out, `.tmp-${step.id}-${phase}.${rawExt}`);
      writeFileSync(rawFile, Buffer.from(await res.arrayBuffer()));

      try {
        execFileSync("ffmpeg", [
          "-y",
          "-i",
          rawFile,
          "-codec:a",
          "libmp3lame",
          "-q:a",
          "4",
          "-ac",
          "1",
          "-ar",
          "24000",
          outFile,
        ]);
      } finally {
        unlinkSync(rawFile);
      }

      const durationMs = ffprobeDurationMs(outFile);
      const elapsedS = ((Date.now() - started) / 1000).toFixed(1);
      manifestByKey.set(key, { stepId: step.id, phase, file: fileName, textHash, durationMs });
      console.log(`${key}  ${elapsedS}s  (${(durationMs / 1000).toFixed(1)}s clip)`);
      rendered++;
    }
  }

  const finalManifest = [...manifestByKey.values()].sort(
    (a, b) => a.stepId.localeCompare(b.stepId) || a.phase.localeCompare(b.phase),
  );
  writeFileSync(manifestFile, JSON.stringify(finalManifest, null, 2) + "\n");
  console.log(
    `\nWrote ${manifestFile} — ${rendered} rendered, ${skipped} skipped, ${finalManifest.length} total entries.`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
