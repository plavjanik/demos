/**
 * The two TTS server request shapes this kit speaks — both POST to
 * `{ttsUrl}/v1/audio/speech` (same path either way), only the JSON body
 * differs. "xtts" is the cloned-voice server (measured ~20s/sentence on
 * this machine — see narrationAudio.tsx's queue comment for why that
 * forces a concurrency-1 queue); "openai" is the OpenAI-shaped
 * `/v1/audio/speech` a Kokoro-style fast fallback expects. Shared by the
 * browser client (narrationAudio.tsx) and scripts/render-narration.mts so
 * neither can drift from the other's request shape.
 */
export type TtsShape = "xtts" | "openai";

export interface TtsRequestParams {
  input: string;
  voice: string;
  language: string;
}

export function ttsSpeechEndpoint(ttsUrl: string): string {
  return `${ttsUrl.replace(/\/+$/, "")}/v1/audio/speech`;
}

export function buildTtsRequestBody(shape: TtsShape, params: TtsRequestParams): Record<string, unknown> {
  if (shape === "xtts") {
    return { input: params.input, voice: params.voice, language: params.language };
  }
  // "openai" (mlx-audio Kokoro, see its /openapi.json SpeechRequest schema):
  // no language concept, "model" is required. speed stays at a neutral
  // default — nothing in the settings model exposes it yet.
  return { model: "kokoro", input: params.input, voice: params.voice, speed: 1.0 };
}
