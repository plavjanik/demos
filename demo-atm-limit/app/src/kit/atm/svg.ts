/**
 * The captured 3270 screen SVGs carry fixed pixel width/height and no
 * viewBox (panelwright's renderSvg() output), so dropping them into a
 * flexible box clips instead of scaling. This adds the viewBox their own
 * width/height imply and switches to 100% so the box can resize them.
 *
 * It also pins every text row to the SVG's own width: the capture sizes
 * its width as columns × the advance of ITS monospace font, and a viewer
 * whose "ui-monospace" is a hair wider spills the last columns past the
 * frame (seen on the owner's machine while this Mac fit to 0.03 px).
 * `textLength` + `lengthAdjust="spacingAndGlyphs"` makes each row exactly
 * the frame width whatever font the browser picks.
 */
export function toResponsiveSvg(svg: string): string {
  const m = /<svg[^>]*\swidth="([\d.]+)"[^>]*\sheight="([\d.]+)"/.exec(svg);
  if (!m) return svg;
  const [, w, h] = m;
  if (/viewBox=/.test(svg)) return svg;
  return svg
    .replace(
      /<svg([^>]*)\swidth="[\d.]+"([^>]*)\sheight="[\d.]+"/,
      `<svg$1 width="100%"$2 height="100%" viewBox="0 0 ${w} ${h}"`,
    )
    .replace(/<text /g, `<text textLength="${w}" lengthAdjust="spacingAndGlyphs" `);
}
