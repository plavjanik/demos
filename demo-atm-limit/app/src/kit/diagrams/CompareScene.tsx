/**
 * Agent loop vs. manual, on one shared linear time axis (minutes). The
 * agent bar is a measured breakdown by group; each manual bar is three
 * kinds of time stacked together — thinking (an estimate), typing
 * (character count at a stated rate) and mechanics (a stopwatch) — never
 * blended into one number. Each kind's own label + minutes sits ON its
 * segment (wide enough to hold it); no separate legend or stage table —
 * this slide is the headline, not the derivation.
 *
 * Purely presentational: every number is pre-computed by the demo (see
 * demo/compare.ts) and handed in as `CompareData`
 * (kit/engine/content.ts) via `useContent().compare` — this scene only
 * lays the numbers out and does the pixel/percentage arithmetic that
 * follows from them, never re-derives what a "group" or a "stage" means.
 */
import { useContent, type CompareData, type CompareGroup, type CompareManualRow } from "../engine/content";
import { splitClockMs } from "../engine/duration";
import { roundedRatio } from "../engine/compareMath";
import "./CompareScene.css";

function kindTotal(k: CompareManualRow["kinds"]): number {
  return k.mechanics + k.typing + k.thinking;
}

// Shares duration.ts's floor with TimerHud's live clock, so the same
// underlying ms never disagrees between the two displays.
function formatMinSec(totalMin: number): string {
  const { minutes, seconds } = splitClockMs(totalMin * 60000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatHM(totalMin: number): string {
  const rounded = Math.round(totalMin);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/**
 * The full-width, not-to-scale ZOOM of the agent loop's group breakdown
 * comes FIRST (the large bar); the to-scale agent bar sits on the shared
 * minutes axis BELOW it, drawn with the same segments/colours/proportions
 * but too narrow to hold their own labels. A dashed funnel between them
 * (SVG, geometry known entirely as track-percent so no DOM measuring is
 * needed) makes the "this sliver, blown up" relationship visible instead
 * of leaving the two bars looking unrelated.
 */
function AgentRow({ agent, axisMaxMin }: { agent: CompareData["agent"]; axisMaxMin: number }): React.JSX.Element {
  const groups: CompareGroup[] = agent.groups;
  const totalMs = groups.reduce((sum, g) => sum + g.ms, 0);
  const totalMin = totalMs / 60000;
  const widthPct = (totalMin / axisMaxMin) * 100;

  return (
    <div className="compare-row-group">
      <div className="compare-zoom">
        <div className="compare-zoom-label-row">
          <span className="compare-zoom-label">zoom — the same {formatMinSec(totalMin)}, not to scale</span>
          {/* Right-aligned on the SAME line as the zoom label, not inside the
              funnel below — a note sitting in the funnel's gap reads as part
              of the funnel and crowds out its tint. */}
          <span className="compare-zoom-note">
            +{formatMinSec(agent.afterCheckMs / 60000)} {agent.afterCheckLabel} (not counted on either side)
          </span>
        </div>
        <div className="compare-zoom-bar">
          {groups.map((g) => (
            <div
              key={g.group}
              className="compare-zoom-seg"
              style={{ width: `${(g.ms / totalMs) * 100}%`, background: g.color }}
            >
              {g.ms / totalMs > 0.07 && <span>{g.group}</span>}
            </div>
          ))}
        </div>
      </div>
      {/* The to-scale bar spans 0-widthPct% and the zoom bar 0-100% of the
          SAME compare-track width, so a 0-1000 viewBox with
          preserveAspectRatio="none" places the funnel's four corners from
          widthPct alone — its left edge is vertical (both bars start at
          the track's left edge) and only the right edge fans out. */}
      <svg className="compare-zoom-funnel" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon className="compare-zoom-funnel-fill" points={`0,100 ${widthPct * 10},100 1000,0 0,0`} />
        <line className="compare-zoom-funnel-dash" x1="0" y1="100" x2="0" y2="0" />
        <line className="compare-zoom-funnel-dash" x1={widthPct * 10} y1="100" x2="1000" y2="0" />
      </svg>
      <div className="compare-row">
        {/* Petr: write "~ 10 minutes" instead of "measured 10:40" here — the
            row LABEL is the headline number, rounded; formatMinSec's exact
            mm:ss stays on the small "measured" tag ON the bar itself
            (compare-total-label below, and KindSegment's own "measured"
            text in ManualRow), which is the derivation, not the headline. */}
        <div className="compare-row-label">Agent loop (~ {Math.round(totalMin)} minutes)</div>
        <div className="compare-track">
          <div className="compare-bar-toscale" style={{ width: `${widthPct}%` }}>
            {groups.map((g) => (
              <div
                key={g.group}
                className="compare-seg-toscale"
                style={{ width: `${(g.ms / totalMs) * 100}%`, background: g.color }}
              />
            ))}
          </div>
          <span className="compare-total-label" style={{ left: `calc(${widthPct}% + 8px)` }}>
            {formatMinSec(totalMin)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** A kind-segment wide enough to hold its own label + minutes; a narrow one shows the minutes alone, and a sliver shows nothing but its colour — never overflows into its neighbour. */
function KindSegment({
  className,
  widthPct,
  label,
  minutes,
}: {
  className: string;
  widthPct: number;
  label: string;
  minutes: number;
}): React.JSX.Element {
  return (
    <div className={`compare-seg ${className}`} style={{ width: `${widthPct}%` }}>
      {widthPct > 18 ? (
        <span>
          {label} · {formatHM(minutes)}
        </span>
      ) : (
        widthPct > 6 && <span>{formatHM(minutes)}</span>
      )}
    </div>
  );
}

function ManualRow({
  row,
  typingRateLabel,
  mechanicsBasis,
  axisMaxMin,
}: {
  row: CompareManualRow;
  typingRateLabel: string;
  mechanicsBasis: CompareData["mechanicsBasis"];
  axisMaxMin: number;
}): React.JSX.Element {
  const kinds = row.kinds;
  const total = kindTotal(kinds);
  const pct = (min: number) => (min / axisMaxMin) * 100;

  return (
    <div className="compare-row">
      <div className="compare-row-label">{row.title}</div>
      <div className="compare-track">
        {/* Stack order thinking -> typing -> mechanics (thinking first, on
            the left) — the slowest, least certain kind leads. */}
        <div className="compare-bar-stack" style={{ width: `${pct(total)}%` }}>
          {kinds.thinking > 0 && (
            <KindSegment
              className="compare-seg-thinking"
              widthPct={(kinds.thinking / total) * 100}
              label="thinking (estimate)"
              minutes={kinds.thinking}
            />
          )}
          {kinds.typing > 0 && (
            <KindSegment
              className="compare-seg-typing"
              widthPct={(kinds.typing / total) * 100}
              label={`typing at ${typingRateLabel}`}
              minutes={kinds.typing}
            />
          )}
          {kinds.mechanics > 0 && (
            <KindSegment
              className="compare-seg-mechanics"
              widthPct={(kinds.mechanics / total) * 100}
              label={mechanicsBasis}
              minutes={kinds.mechanics}
            />
          )}
        </div>
        <span className="compare-total-label" style={{ left: `calc(${pct(total)}% + 8px)` }}>
          {formatHM(total)}
        </span>
      </div>
    </div>
  );
}

/**
 * One row under the axis: a swatch per agent-loop group (bar order, same
 * `g.color` the bars use) and a swatch per manual kind. The manual swatches
 * reuse the bars' own `.compare-seg-*` classes (not a copied colour) so a
 * palette change there can't drift out of sync with what this legend shows.
 */
function CompareLegend({
  groups,
  typingRateLabel,
  mechanicsBasis,
}: {
  groups: CompareGroup[];
  typingRateLabel: string;
  mechanicsBasis: CompareData["mechanicsBasis"];
}): React.JSX.Element {
  return (
    <div className="compare-legend">
      <div className="compare-legend-group">
        <span className="compare-legend-heading">Agent loop:</span>
        {groups.map((g) => (
          <span className="compare-legend-item" key={g.group}>
            <span className="compare-legend-swatch" style={{ background: g.color }} />
            {g.group}
          </span>
        ))}
      </div>
      <div className="compare-legend-group">
        <span className="compare-legend-heading">Manual:</span>
        <span className="compare-legend-item">
          <span className="compare-legend-swatch compare-seg-thinking" />
          thinking (estimate)
        </span>
        <span className="compare-legend-item">
          <span className="compare-legend-swatch compare-seg-typing" />
          typing (measured characters at {typingRateLabel})
        </span>
        <span className="compare-legend-item">
          <span className="compare-legend-swatch compare-seg-mechanics" />
          mechanics ({mechanicsBasis})
        </span>
      </div>
    </div>
  );
}

function AxisTicks({ axisMaxMin }: { axisMaxMin: number }): React.JSX.Element {
  const step = axisMaxMin > 120 ? 30 : axisMaxMin > 40 ? 10 : 5;
  const ticks: number[] = [];
  for (let m = 0; m <= axisMaxMin; m += step) ticks.push(m);
  return (
    <div className="compare-axis">
      {ticks.map((m) => (
        <div key={m} className="compare-axis-tick" style={{ left: `${(m / axisMaxMin) * 100}%` }}>
          <span>{m}m</span>
        </div>
      ))}
    </div>
  );
}

export function CompareScene(): React.JSX.Element | null {
  const { compare } = useContent();
  if (!compare) return null;

  const agentTotalMin = compare.agent.groups.reduce((sum, g) => sum + g.ms, 0) / 60000;
  const manualTotals = compare.manual.map((row) => kindTotal(row.kinds));
  const axisMaxMin = Math.max(agentTotalMin, ...manualTotals) * 1.08;
  // The headline ratio — see compareMath.ts's own doc comment. Shared with
  // any other scene that wants to quote the same number (e.g. a demo's
  // title slide), so it can never disagree with what this slide shows.
  const ratio = roundedRatio(compare);

  return (
    <div className="compare-scene">
      <div className="compare-header">
        <h1 className="compare-title">{compare.title}</h1>
        <div className="compare-headline">
          <div className="compare-headline-value">≈ {ratio}× faster</div>
          <div className="compare-headline-label">{compare.ratioLabel}</div>
        </div>
      </div>

      <div className="compare-bars">
        <AgentRow agent={compare.agent} axisMaxMin={axisMaxMin} />
        {compare.manual.map((row) => (
          <ManualRow
            key={row.title}
            row={row}
            typingRateLabel={compare.typingRateLabel}
            mechanicsBasis={compare.mechanicsBasis}
            axisMaxMin={axisMaxMin}
          />
        ))}
        <div className="compare-row compare-row-axis">
          <div className="compare-row-label" />
          <div className="compare-track">
            <AxisTicks axisMaxMin={axisMaxMin} />
          </div>
        </div>
      </div>

      <CompareLegend
        groups={compare.agent.groups}
        typingRateLabel={compare.typingRateLabel}
        mechanicsBasis={compare.mechanicsBasis}
      />

      <div className="compare-takeaway">{compare.takeaway}</div>
    </div>
  );
}
