/**
 * PresenterBar.tsx's "voice" item (kit/stage/PresenterControls.tsx)
 * opens this — every spoken-narration setting (kit/engine/
 * narrationSettings.ts) in one small panel, plus a test button that speaks
 * a fixed short line with whatever's currently set and reports how long
 * the fetch actually took (a real measurement, not an estimate), and the
 * live cache's size with a way to clear it. Not real VS Code chrome, like
 * the narration/review toggles beside it.
 *
 * The voice field is a `<select>` (two optgroups, cloned then built-in)
 * when the "xtts" shape's `/v1/voices` endpoint answers with a list that
 * contains the CURRENT voice — fetched once on open and again on the "↻"
 * button, never on every keystroke of the URL field. It falls back to the
 * plain free-text input (with a one-line muted note) for the "openai"
 * shape (no such endpoint to ask), a server that doesn't have the endpoint
 * (fetch fails/404s), or a saved voice the list doesn't recognize — see
 * voiceList.ts's `voiceListHasVoice`, the one thing that decides this.
 * Same list's `languages`, when present, turns the language field into a
 * select the same way.
 *
 * Rendered through a PORTAL to `document.body`, not in place. PresenterBar
 * itself already sits outside the scaled `.stage-inner` (Stage.tsx), so
 * `position: fixed` would resolve to the real viewport even without the
 * portal — but a second trigger for this same popover used to live inside
 * `.stage-inner` (StatusBar.tsx, removed review round 6, PresenterControls
 * mounted there too), where a transformed ancestor WOULD have hijacked a
 * plain `position: fixed`. The portal is kept rather than special-cased
 * away now that only one trigger remains: it costs nothing and means this
 * file doesn't need re-auditing if a future trigger ends up nested again.
 */
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNarrationAudio } from "../engine/narrationAudio";
import type { NarrationMode } from "../engine/narrationSettings";
import type { TtsShape } from "../engine/ttsRequest";
import { voiceListHasVoice, voiceOptionGroups, voicesEndpoint, type VoiceList } from "../engine/voiceList";
import "./VoicePopover.css";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type VoiceListStatus = "idle" | "loading" | "loaded" | "error";

export function VoicePopover({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { settings, updateSettings, playTest, isActive, status, lastFetchMs, lastError, cacheBytes, clearCache } =
    useNarrationAudio();
  const testActive = isActive("__test__", "narration");
  const testStatus = testActive ? status : "idle";

  const [voiceList, setVoiceList] = useState<VoiceList | null>(null);
  const [voiceListStatus, setVoiceListStatus] = useState<VoiceListStatus>("idle");

  const fetchVoices = useCallback(async () => {
    setVoiceListStatus("loading");
    try {
      const res = await fetch(voicesEndpoint(settings.ttsUrl));
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as VoiceList;
      setVoiceList(data);
      setVoiceListStatus("loaded");
    } catch {
      setVoiceList(null);
      setVoiceListStatus("error");
    }
  }, [settings.ttsUrl]);

  // Fetch once "on open" (mount) and whenever the shape flips TO "xtts" —
  // never on a URL keystroke, which would fire a request per character; the
  // "↻" button is how a pasted new URL gets picked up.
  useEffect(() => {
    if (settings.ttsShape !== "xtts") {
      setVoiceList(null);
      setVoiceListStatus("idle");
      return;
    }
    void fetchVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.ttsShape]);

  const matched = voiceList !== null && voiceListHasVoice(voiceList, settings.voice);
  const showVoiceSelect = settings.ttsShape === "xtts" && voiceListStatus === "loaded" && matched;
  const showVoiceNote =
    settings.ttsShape !== "xtts" || voiceListStatus === "error" || (voiceListStatus === "loaded" && !matched);
  const showLanguageSelect = voiceListStatus === "loaded" && !!voiceList?.languages?.length;

  return createPortal(
    <div className="voice-popover" role="dialog" aria-label="Spoken narration settings">
      <div className="voice-popover-header">
        <span>
          <span className="codicon codicon-unmute" aria-hidden="true" /> Spoken narration
        </span>
        <button type="button" className="voice-popover-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <label className="voice-field">
        <span>Mode</span>
        <select value={settings.mode} onChange={(e) => updateSettings({ mode: e.target.value as NarrationMode })}>
          <option value="off">Off</option>
          <option value="rendered">Rendered (mp3 files)</option>
          <option value="live">Live (TTS server)</option>
        </select>
      </label>

      <label className="voice-field voice-field-checkbox">
        <input
          type="checkbox"
          checked={settings.autoplay}
          onChange={(e) => updateSettings({ autoplay: e.target.checked })}
        />
        <span>Autoplay narration on each step</span>
      </label>

      <label className="voice-field">
        <span>TTS server URL</span>
        <input
          type="text"
          value={settings.ttsUrl}
          onChange={(e) => updateSettings({ ttsUrl: e.target.value })}
          placeholder="http://localhost:8085"
        />
      </label>

      <label className="voice-field">
        <span>Request shape</span>
        <select value={settings.ttsShape} onChange={(e) => updateSettings({ ttsShape: e.target.value as TtsShape })}>
          <option value="xtts">XTTS (cloned voice)</option>
          <option value="openai">OpenAI-shaped (Kokoro fallback)</option>
        </select>
      </label>

      <label className="voice-field">
        <span className="voice-field-label-row">
          Voice
          {settings.ttsShape === "xtts" && (
            <button
              type="button"
              className="voice-refresh-btn"
              aria-label="Refresh voice list"
              title="Refresh voice list"
              onClick={() => void fetchVoices()}
            >
              {voiceListStatus === "loading" ? "…" : "↻"}
            </button>
          )}
        </span>
        {showVoiceSelect && voiceList ? (
          <select value={settings.voice} onChange={(e) => updateSettings({ voice: e.target.value })}>
            {voiceOptionGroups(voiceList).map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.voices.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <input type="text" value={settings.voice} onChange={(e) => updateSettings({ voice: e.target.value })} />
        )}
        {showVoiceNote && <span className="voice-field-note">server lists no voices</span>}
      </label>

      <label className="voice-field">
        <span>Language</span>
        {showLanguageSelect && voiceList ? (
          <select value={settings.language} onChange={(e) => updateSettings({ language: e.target.value })}>
            {voiceList.languages!.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        ) : (
          <input type="text" value={settings.language} onChange={(e) => updateSettings({ language: e.target.value })} />
        )}
      </label>

      <label className="voice-field">
        <span>Prefetch ahead (live mode)</span>
        <input
          type="number"
          min={0}
          max={10}
          value={settings.prefetchAhead}
          onChange={(e) => updateSettings({ prefetchAhead: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>

      <div className="voice-popover-footer">
        <button type="button" className="voice-btn" disabled={settings.mode === "off"} onClick={playTest}>
          {testStatus === "loading" ? "Speaking test line…" : testStatus === "playing" ? "Playing…" : "Test voice"}
        </button>
        <div className="voice-popover-status">
          {testStatus === "error" && lastError ? (
            <span className="voice-popover-error">{lastError}</span>
          ) : lastFetchMs !== null ? (
            <span>Last fetch: {lastFetchMs === 0 ? "instant (rendered file)" : `${lastFetchMs} ms`}</span>
          ) : (
            <span>No fetch yet</span>
          )}
        </div>
        <div className="voice-popover-status">
          {voiceListStatus === "loading" && <span>Voices: loading…</span>}
          {voiceListStatus === "error" && <span>Voices: server has no voice list</span>}
          {voiceListStatus === "loaded" && voiceList && (
            <span>
              Voices: {voiceList.cloned.length} cloned, {voiceList.builtin.length} built-in
            </span>
          )}
          {voiceListStatus === "idle" && <span>Voices: n/a for this request shape</span>}
        </div>
        <div className="voice-popover-cache">
          <span>Cache: {formatBytes(cacheBytes)}</span>
          <button type="button" className="voice-btn-link" onClick={clearCache}>
            Clear
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
