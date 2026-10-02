/**
 * Spoken-narration settings: persisted per demo in localStorage (mirrors
 * reviewData.ts's own per-demoId prefixing, so two demos in one browser
 * profile never share a voice/URL choice), with a one-shot URL override for
 * a quick start link (`?tts=...&voice=...&narration=live`) — read once at
 * StepEngineProvider mount time and folded into the stored settings, same
 * shape as StepEngine.tsx's own `?review` one-shot override.
 */
import type { TtsShape } from "./ttsRequest";

export type NarrationMode = "off" | "rendered" | "live";

export interface NarrationSettings {
  mode: NarrationMode;
  ttsUrl: string;
  ttsShape: TtsShape;
  voice: string;
  language: string;
  autoplay: boolean;
  prefetchAhead: number;
}

export const DEFAULT_NARRATION_SETTINGS: NarrationSettings = {
  mode: "off",
  ttsUrl: "http://localhost:8085",
  ttsShape: "xtts",
  voice: "tata",
  language: "en",
  autoplay: false,
  prefetchAhead: 2,
};

const SETTINGS_KEY = "demo-narration-settings";

function isNarrationMode(v: unknown): v is NarrationMode {
  return v === "off" || v === "rendered" || v === "live";
}
function isTtsShape(v: unknown): v is TtsShape {
  return v === "xtts" || v === "openai";
}

export function readNarrationSettings(keyPrefix: string): NarrationSettings {
  let stored: NarrationSettings = DEFAULT_NARRATION_SETTINGS;
  try {
    const raw = window.localStorage.getItem(keyPrefix + SETTINGS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") stored = { ...DEFAULT_NARRATION_SETTINGS, ...(parsed as object) };
    }
  } catch {
    // private window / storage blocked / corrupt JSON — fall back to defaults
  }
  return applyUrlOverrides(stored);
}

/** `?tts=`, `?voice=`, `?narration=` — a one-shot quick-start link (Petr sends himself one with a colleague's TTS server address); does not persist until the presenter also flips something in the popover, matching StepEngine's `?review` behavior. */
function applyUrlOverrides(settings: NarrationSettings): NarrationSettings {
  const params = new URLSearchParams(window.location.search);
  const next = { ...settings };
  const tts = params.get("tts");
  const voice = params.get("voice");
  const narration = params.get("narration");
  if (tts) next.ttsUrl = tts;
  if (voice) next.voice = voice;
  if (narration && isNarrationMode(narration)) next.mode = narration;
  return next;
}

export function writeNarrationSettings(settings: NarrationSettings, keyPrefix: string): void {
  try {
    window.localStorage.setItem(keyPrefix + SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore — nothing to persist it in this session
  }
}

export function isValidTtsShape(v: string): v is TtsShape {
  return isTtsShape(v);
}
