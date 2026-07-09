/**
 * Format a duration in minutes to a human-readable string.
 * Examples:
 *  - 30  → "30 min"
 *  - 60  → "1 hr"
 *  - 75  → "1 hr 15 min"
 *  - 90  → "1 hr 30 min"
 *  - 120 → "2 hrs"
 *  - 300 → "5 hrs"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 min";

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return hrs === 1 ? "1 hr" : `${hrs} hrs`;
  return hrs === 1 ? `1 hr ${mins} min` : `${hrs} hrs ${mins} min`;
}
