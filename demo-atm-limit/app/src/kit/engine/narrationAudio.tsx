/**
 * Spoken narration playback: one `<audio>` element owned here (so a step
 * change stops whatever was playing), two sources behind one `play()` call
 * — "live" POSTs to a local TTS server (see ttsRequest.ts), "rendered"
 * plays a pre-baked mp3 from `public/narration/<narrationId>/manifest.json`
 * (scripts/render-narration.mts writes both). Settings persist per demo in
 * localStorage (narrationSettings.ts); `narrationId` is a STABLE identifier
 * for the manifest folder / settings key, distinct from StepEngine's own
 * `demoId` (which DOGECICS deliberately leaves empty to keep its existing
 * review-data keys — narration is a new feature with no such legacy key to
 * preserve, so both demos always pass a real id here).
 *
 * The XTTS server is slow (~20s/sentence, measured) and single-threaded, so
 * every live fetch — a `play()`, a background `prefetch()`, or another
 * step's still-running prefetch — goes through ONE concurrency-1 queue;
 * `play()` jumps the queue (unshift) so a presenter's click is never stuck
 * behind two queued prefetches. Requests are de-duped by cache key so a
 * `play()` for text a `prefetch()` already queued joins that same
 * in-flight promise instead of firing a second request.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStepEngine } from "./StepEngine";
import { effectiveText } from "./reviewData";
import { speechTextForStep } from "./speechText";
import { buildTtsRequestBody, ttsSpeechEndpoint } from "./ttsRequest";
import { readNarrationSettings, writeNarrationSettings, type NarrationSettings } from "./narrationSettings";
import { cacheKey, cacheSizeBytes, clearCache, getCachedClip, putCachedClip, sha256Hex } from "./narrationCache";
import { findManifestEntry, type NarrationManifest } from "./narrationManifest";
import type { Step } from "./types";

export type NarrationField = "narration" | "narrationAfter";
export type NarrationPlaybackStatus = "idle" | "loading" | "playing" | "not-rendered" | "error";

/** Mirrors StepEngine.tsx's own guard of the same name — kept local rather than exported/shared so this file stays a self-contained playback module; both copies exist because "V" is one more global key alongside StepEngine's own arrows/S/R. */
function isEditableFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "TEXTAREA" || tag === "INPUT" || (el as HTMLElement).isContentEditable;
}

class TtsQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = false;
  private inflight = new Map<string, Promise<Blob>>();

  enqueue(key: string, factory: () => Promise<Blob>, priority: boolean): Promise<Blob> {
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const promise = new Promise<Blob>((resolve, reject) => {
      const task = async () => {
        try {
          resolve(await factory());
        } catch (e) {
          reject(e);
        } finally {
          this.inflight.delete(key);
        }
      };
      if (priority) this.queue.unshift(task);
      else this.queue.push(task);
      void this.pump();
    });
    this.inflight.set(key, promise);
    return promise;
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const task = this.queue.shift()!;
      await task();
    }
    this.running = false;
  }
}

export interface NarrationAudioApi {
  settings: NarrationSettings;
  updateSettings: (patch: Partial<NarrationSettings>) => void;
  /** True while THIS step+field's clip is the one the single `<audio>` element currently holds — the only two the UI ever asks about are the step currently on stage. */
  isActive: (stepId: string, field: NarrationField) => boolean;
  status: NarrationPlaybackStatus;
  /** Wall-clock ms the last fetch (live or a rendered-mode fallback) actually took — a real measurement, shown in the voice popover; null before any fetch. */
  lastFetchMs: number | null;
  lastError: string | null;
  play: (step: Step, field: NarrationField) => void;
  stop: () => void;
  /** A fixed short test line, spoken with the current settings regardless of any step — the popover's "test" button. */
  playTest: () => void;
  cacheBytes: number;
  refreshCacheBytes: () => void;
  clearCache: () => void;
}

const NarrationAudioContext = createContext<NarrationAudioApi | null>(null);

const TEST_LINE = "This is a narration test.";

export function NarrationAudioProvider({
  narrationId,
  children,
}: {
  /** Manifest-folder / settings-key id — always a real string ("dogecics"/"techutex"), see file header. */
  narrationId: string;
  children: ReactNode;
}): React.JSX.Element {
  const { step, steps, index, hotspotFired, reviewData } = useStepEngine();
  const keyPrefix = `${narrationId}-`;

  const [settings, setSettings] = useState<NarrationSettings>(() => readNarrationSettings(keyPrefix));
  const updateSettings = useCallback(
    (patch: Partial<NarrationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        writeNarrationSettings(next, keyPrefix);
        return next;
      });
    },
    [keyPrefix],
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const queueRef = useRef(new TtsQueue());
  const manifestRef = useRef<NarrationManifest | null>(null);
  const manifestFetchRef = useRef<Promise<NarrationManifest | null> | null>(null);
  // Bumped on every play()/stop() so an async fetch that resolves after the
  // presenter has already moved on (or clicked stop) knows not to start
  // playback out from under whatever is current now.
  const generationRef = useRef(0);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [status, setStatus] = useState<NarrationPlaybackStatus>("idle");
  const [lastFetchMs, setLastFetchMs] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [cacheBytes, setCacheBytes] = useState(0);

  const refreshCacheBytes = useCallback(() => {
    void cacheSizeBytes().then(setCacheBytes);
  }, []);
  useEffect(() => {
    refreshCacheBytes();
  }, [refreshCacheBytes]);

  const isActive = useCallback(
    (stepId: string, field: NarrationField) => activeKey === `${stepId}:${field}`,
    [activeKey],
  );

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const stop = useCallback(() => {
    generationRef.current++;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    revokeObjectUrl();
    setActiveKey(null);
    setStatus("idle");
  }, []);

  const loadManifest = useCallback((): Promise<NarrationManifest | null> => {
    if (manifestRef.current) return Promise.resolve(manifestRef.current);
    if (!manifestFetchRef.current) {
      manifestFetchRef.current = fetch(`narration/${narrationId}/manifest.json`)
        .then((res) => (res.ok ? (res.json() as Promise<NarrationManifest>) : null))
        .then((m) => {
          manifestRef.current = m;
          return m;
        })
        .catch(() => null);
    }
    return manifestFetchRef.current;
  }, [narrationId]);

  /** `priority` jumps the queue (play()) vs. joining the back of it (background prefetch()) — see the queue's own doc comment. De-duped by cache key either way, so a play() for text a prefetch() already queued joins that same in-flight promise instead of firing a second request. */
  const fetchLiveBlob = useCallback(
    async (text: string, priority: boolean): Promise<Blob> => {
      const key = await cacheKey(settings.voice, text);
      const cached = await getCachedClip(key);
      if (cached) return cached;
      return queueRef.current.enqueue(
        key,
        async () => {
          const res = await fetch(ttsSpeechEndpoint(settings.ttsUrl), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              buildTtsRequestBody(settings.ttsShape, {
                input: text,
                voice: settings.voice,
                language: settings.language,
              }),
            ),
          });
          if (!res.ok) throw new Error(`TTS server responded ${res.status}`);
          const blob = await res.blob();
          await putCachedClip(key, blob);
          refreshCacheBytes();
          return blob;
        },
        priority,
      );
    },
    [settings.voice, settings.ttsUrl, settings.ttsShape, settings.language, refreshCacheBytes],
  );

  const playBlobUrl = useCallback((url: string, isOwnedObjectUrl: boolean) => {
    revokeObjectUrl();
    if (isOwnedObjectUrl) objectUrlRef.current = url;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = url;
    void audio.play().catch(() => {
      // Autoplay can be blocked (no user gesture yet) for the autoplay-on-
      // step-change path — the clip is loaded and ready; a manual click on
      // the speaker button (a real gesture) will play it.
    });
  }, []);

  const playText = useCallback(
    (key: string, text: string) => {
      const myGeneration = ++generationRef.current;
      setActiveKey(key);
      setStatus("loading");
      setLastError(null);
      const start = performance.now();

      const runLive = async () => {
        try {
          const blob = await fetchLiveBlob(text, true);
          if (generationRef.current !== myGeneration) return;
          setLastFetchMs(Math.round(performance.now() - start));
          playBlobUrl(URL.createObjectURL(blob), true);
          setStatus("playing");
        } catch (e) {
          if (generationRef.current !== myGeneration) return;
          setStatus("error");
          setLastError(e instanceof Error ? e.message : "TTS request failed");
        }
      };

      if (settings.mode === "live") {
        void runLive();
        return;
      }

      // "rendered": look the current step+phase up in the manifest, keyed
      // by stepId+phase and gated on the CURRENT effective text's own hash
      // matching what was rendered — a stale mismatch (narration edited
      // since the mp3 was rendered) falls through to a live fetch exactly
      // like no manifest entry existing at all.
      const [stepId, phase] = key.split(":") as [string, NarrationField];
      void (async () => {
        const manifest = await loadManifest();
        if (generationRef.current !== myGeneration) return;
        const entry = manifest ? findManifestEntry(manifest, stepId, phase) : undefined;
        if (entry) {
          const textHash = await sha256Hex(text);
          if (textHash === entry.textHash) {
            setLastFetchMs(0);
            playBlobUrl(`narration/${narrationId}/${entry.file}`, false);
            setStatus("playing");
            return;
          }
        }
        // No matching rendered file — fall back to live if a server is
        // configured (settings.ttsUrl is always non-empty; a genuinely
        // unreachable one just fails the fetch below, which is reported the
        // same as any other live error, not a separate "not configured"
        // state).
        if (settings.ttsUrl) {
          await runLive();
        } else if (generationRef.current === myGeneration) {
          setStatus("not-rendered");
        }
      })();
    },
    [settings.mode, settings.ttsUrl, fetchLiveBlob, loadManifest, narrationId, playBlobUrl],
  );

  const play = useCallback(
    (targetStep: Step, field: NarrationField) => {
      if (settings.mode === "off") return;
      const shipped = targetStep[field];
      const effective = effectiveText(targetStep, reviewData, field);
      const override = field === "narration" ? targetStep.narrationSpeech : targetStep.narrationAfterSpeech;
      const edited = effective !== undefined && effective !== (shipped ?? "");
      const text = speechTextForStep(effective, edited ? undefined : override);
      if (!text) return;
      playText(`${targetStep.id}:${field}`, text);
    },
    [settings.mode, reviewData, playText],
  );

  const playTest = useCallback(() => {
    if (settings.mode === "off") return;
    playText("__test__:narration", TEST_LINE);
  }, [settings.mode, playText]);

  // Autoplay: speak `narration` the instant a step is shown, and
  // `narrationAfter` the instant its hotspot fires (replacing, never
  // stacking — same rule NarrationCallout.tsx follows for what's on
  // screen). Stops whatever was playing first (a step change or hotspot
  // fire always means "the words on screen just changed").
  const stepIdRef = useRef(step.id);
  useEffect(() => {
    if (stepIdRef.current === step.id) return;
    stepIdRef.current = step.id;
    stop();
    if (settings.autoplay && settings.mode !== "off") play(step, "narration");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  const hotspotFiredRef = useRef(hotspotFired);
  useEffect(() => {
    if (hotspotFiredRef.current === hotspotFired) return;
    hotspotFiredRef.current = hotspotFired;
    if (hotspotFired && step.narrationAfter && settings.autoplay && settings.mode !== "off") {
      stop();
      play(step, "narrationAfter");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspotFired]);

  // Background prefetch of the next `prefetchAhead` steps' narration text —
  // live mode + autoplay only (rendered mode has nothing to prefetch: the
  // files are static and load instantly; without autoplay the presenter
  // triggers playback by hand and prefetching ahead of a click they may
  // never make just burns the slow server's one concurrency slot).
  useEffect(() => {
    if (settings.mode !== "live" || !settings.autoplay) return;
    for (let i = 1; i <= settings.prefetchAhead; i++) {
      const upcoming = steps[index + i];
      if (!upcoming) break;
      const text = speechTextForStep(upcoming.narration, upcoming.narrationSpeech);
      if (text) void fetchLiveBlob(text, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, settings.mode, settings.autoplay, settings.prefetchAhead]);

  // "V" toggles play/stop of whatever narration field is currently on
  // screen — mirrors StepEngine's own key-handling guard (isEditableFocused
  // above) so typing "v" into a review-panel textarea never triggers this.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "v" && e.key !== "V") return;
      if (isEditableFocused()) return;
      if (settings.mode === "off") return;
      const showingAfter = !!step.narrationAfter && hotspotFired;
      const field: NarrationField = showingAfter ? "narrationAfter" : "narration";
      if (isActive(step.id, field) && status === "playing") stop();
      else play(step, field);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settings.mode, step, hotspotFired, isActive, status, stop, play]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setStatus("idle");
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  const clearCacheAndRefresh = useCallback(() => {
    void clearCache().then(refreshCacheBytes);
  }, [refreshCacheBytes]);

  const api = useMemo<NarrationAudioApi>(
    () => ({
      settings,
      updateSettings,
      isActive,
      status,
      lastFetchMs,
      lastError,
      play,
      stop,
      playTest,
      cacheBytes,
      refreshCacheBytes,
      clearCache: clearCacheAndRefresh,
    }),
    [
      settings,
      updateSettings,
      isActive,
      status,
      lastFetchMs,
      lastError,
      play,
      stop,
      playTest,
      cacheBytes,
      refreshCacheBytes,
      clearCacheAndRefresh,
    ],
  );

  return (
    <NarrationAudioContext.Provider value={api}>
      {children}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- presenter narration, no captions track exists */}
      <audio ref={audioRef} hidden />
    </NarrationAudioContext.Provider>
  );
}

export function useNarrationAudio(): NarrationAudioApi {
  const ctx = useContext(NarrationAudioContext);
  if (!ctx) throw new Error("useNarrationAudio() outside <NarrationAudioProvider>");
  return ctx;
}
