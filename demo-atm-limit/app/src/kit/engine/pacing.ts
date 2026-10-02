/**
 * Presentation-pace constants shared between a scene that plays something
 * back at a fixed rate (kit/vscode/Terminal.tsx's line-by-line replay) and
 * any demo that needs to know how long that playback will take (to hold a
 * later chat item back via ChatItem.revealAfterMs until a terminal replay
 * it refers to has actually finished scrolling by). Living here — not in
 * Terminal.tsx itself — means a demo's steps module can import it without
 * reaching into a specific scene component for a constant.
 */
export const REPLAY_MS_PER_LINE = 80;
