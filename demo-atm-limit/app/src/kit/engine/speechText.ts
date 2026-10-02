/**
 * Reduces a narration string (kit Markdown — see vscode/markdownLite.tsx,
 * the renderer this mirrors) to plain speech text for a TTS request: strips
 * `**bold**`/`` `code` `` markup, list markers and heading hashes down to
 * their inner text, and turns a paragraph/list-item break into an explicit
 * pause — a period (unless the block already ends in sentence punctuation)
 * followed by a newline — since a TTS engine has no notion of a Markdown
 * blank line. Shared by kit/engine/narrationAudio.tsx's live client and
 * scripts/render-narration.mts so a rendered mp3's cached textHash always
 * matches what live playback would have spoken for the same source text.
 */
function inlineToPlain(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}

export function reduceNarrationToSpeech(markdown: string): string {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push(inlineToPlain(para.join(" ")));
      para = [];
    }
  };
  const flushList = () => {
    for (const item of list) blocks.push(inlineToPlain(item));
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    const listMatch = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushPara();
      flushList();
      blocks.push(inlineToPlain(headingMatch[2]!));
    } else if (listMatch) {
      flushPara();
      list.push(listMatch[1]!);
    } else if (line.trim() === "") {
      flushPara();
      flushList();
    } else if (list.length) {
      // Continuation of the list item currently being built (markdownLite's
      // own indented-continuation rule, mirrored here).
      list[list.length - 1] += " " + line.trim();
    } else {
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();

  return blocks
    .filter((b) => b.length > 0)
    .map((b) => (/[.!?:]$/.test(b) ? b : `${b}.`))
    .join("\n");
}

/**
 * The text to actually SPEAK for one narration/narrationAfter field: a
 * per-step `narrationSpeech`/`narrationAfterSpeech` override (Step, for
 * cases where the spoken form should differ from the on-screen text —
 * numbers, code words) when one is given, else the shown Markdown itself —
 * either way reduced through `reduceNarrationToSpeech`. `text` is already
 * whatever the caller decided is "on screen" (the kit's live client passes
 * the review-mode-effective text; the render script passes the shipped
 * Step field — review-mode edits are a live presenter feature, never baked
 * into a rendered mp3).
 */
export function speechTextForStep(text: string | undefined, speechOverride: string | undefined): string {
  if (text === undefined && speechOverride === undefined) return "";
  return reduceNarrationToSpeech(speechOverride ?? text ?? "");
}
