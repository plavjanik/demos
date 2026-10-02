/**
 * The single ms -> mm:ss split used everywhere a duration is shown as a
 * clock — TimerHud's live "agent loop" clock and CompareScene's precise
 * "measured" totals (also quoted from steps.ts's process-step summary)
 * all build their text from this one function, so they can never disagree
 * on the same underlying ms. Before this existed they didn't: TimerHud
 * floored to whole seconds while CompareScene's formatMinSec rounded,
 * so the same capture printed "08:11" on the clock and "8:12" on the bar.
 * Floors, deliberately: a clock should show only time that has actually
 * elapsed, never round up to a second that hasn't happened yet.
 */
export function splitClockMs(ms: number): { minutes: number; seconds: number } {
  const totalSeconds = Math.floor(ms / 1000);
  return { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 };
}
