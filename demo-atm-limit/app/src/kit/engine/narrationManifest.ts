/**
 * The rendered-mp3 manifest shape, `public/narration/<narrationId>/
 * manifest.json` — written by scripts/render-narration.mts, read once by
 * narrationAudio.tsx's "rendered" source. `textHash` is `sha256(speech
 * text)` (see speechText.ts) — NOT voice-scoped, since one manifest entry
 * names one rendered file for one piece of text; comparing it against the
 * CURRENT effective text's own hash is how playback notices a narration
 * edit has made the rendered file stale.
 */
export interface NarrationManifestEntry {
  stepId: string;
  phase: "narration" | "narrationAfter";
  /** File name relative to the manifest's own directory. */
  file: string;
  textHash: string;
  durationMs: number;
}

export type NarrationManifest = NarrationManifestEntry[];

export function findManifestEntry(
  manifest: NarrationManifest,
  stepId: string,
  phase: "narration" | "narrationAfter",
): NarrationManifestEntry | undefined {
  return manifest.find((e) => e.stepId === stepId && e.phase === phase);
}
