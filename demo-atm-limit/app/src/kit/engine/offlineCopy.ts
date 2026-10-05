/**
 * The "Download for offline use" link and its offline-copy marker.
 *
 * scripts/build-offline.mts stamps `data-offline-copy` on the <html> tag of every
 * offline file (markOfflineCopy); the app hides its download controls when that
 * attribute is present, because from disk they would point at a file that is not there.
 */

export interface OfflineCopy {
  /** Relative URL of this page's own single-file offline copy. */
  href: string;
  /** Suggested file name for the saved copy. */
  download: string;
}

/** Adds `data-offline-copy=""` to the first <html …> tag; throws when there is none (the build must fail closed). */
export function markOfflineCopy(html: string): string {
  const out = html.replace(/<html\b(?![^>]*\sdata-offline-copy\b)/i, '<html data-offline-copy=""');
  if (!/<html\b[^>]*\sdata-offline-copy\b/i.test(out)) throw new Error("markOfflineCopy: no <html> tag to mark");
  return out;
}

/** True when running from an offline file (the marker is on the document element). */
export function isOfflineCopy(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute("data-offline-copy");
}

/** The copy to offer, or undefined when none was given or this page IS the offline copy. */
export function visibleOfflineCopy(copy: OfflineCopy | undefined): OfflineCopy | undefined {
  return copy && !isOfflineCopy() ? copy : undefined;
}

export const OFFLINE_DOWNLOAD_TITLE = "Download this demo for offline use (one self-contained HTML file)";
