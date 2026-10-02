/**
 * The XTTS server's `/v1/voices` payload (`{cloned, builtin, default,
 * languages}`) and the pure list -> UI mapping VoicePopover.tsx renders
 * from — kept generic and demo-free so it's testable with no React. Not
 * every TTS server has this endpoint (the "openai"-shaped Kokoro fallback
 * doesn't, and neither does an XTTS server old enough to predate it), so
 * VoicePopover.tsx always falls back to a free-text voice field whenever
 * this list can't answer "does the CURRENT voice exist" — see
 * `voiceListHasVoice`.
 */
export interface VoiceList {
  cloned: string[];
  builtin: string[];
  default?: string;
  languages?: string[];
}

export function voicesEndpoint(ttsUrl: string): string {
  return `${ttsUrl.replace(/\/+$/, "")}/v1/voices`;
}

export function voiceListHasVoice(list: VoiceList, voice: string): boolean {
  return list.cloned.includes(voice) || list.builtin.includes(voice);
}

export interface VoiceOptionGroup {
  label: string;
  voices: string[];
}

/**
 * Cloned voices first (the owner's own cloned voice is the whole point of
 * this feature) then built-in ones, each as its own optgroup — an empty
 * group is omitted rather than rendered as an empty `<optgroup>`.
 */
export function voiceOptionGroups(list: VoiceList): VoiceOptionGroup[] {
  const groups: VoiceOptionGroup[] = [];
  if (list.cloned.length > 0) groups.push({ label: "Cloned", voices: list.cloned });
  if (list.builtin.length > 0) groups.push({ label: "Built-in", voices: list.builtin });
  return groups;
}
