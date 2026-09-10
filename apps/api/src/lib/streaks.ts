/**
 * Habit streak calculation.
 *
 * A "current streak" counts consecutive COMPLETED days running back from the
 * most recent relevant day. The most recent relevant day is:
 *   - today, when the habit has already been logged today, OR
 *   - yesterday, when today has not yet been logged (the streak survives
 *     until the end of today).
 *
 * SKIPPED days break the streak because the user explicitly opted out.
 */

export interface StreakLog {
  date: string; // YYYY-MM-DD (local)
  status: string;
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return dateToKey(date);
}

export function computeBestStreak(logs: StreakLog[]): number {
  if (!logs || logs.length === 0) return 0;
  const completed = new Set<string>();
  for (const log of logs) {
    if (log.status === 'COMPLETED' && typeof log.date === 'string') completed.add(log.date);
  }
  let best = 0;
  for (const key of completed) {
    let run = 1;
    let cursor = addDays(key, -1);
    while (completed.has(cursor)) {
      run += 1;
      cursor = addDays(cursor, -1);
    }
    if (run > best) best = run;
  }
  return best;
}

/**
 * Compute the current streak given a set of logs. `todayKey` is supplied by
 * the caller (server local date) so timezone handling stays explicit.
 */
export function computeCurrentStreak(logs: StreakLog[], todayKey = dateToKey(new Date())): number {
  if (!logs || logs.length === 0) return 0;

  const completed = new Set<string>();
  for (const log of logs) {
    if (log.status === 'COMPLETED' && typeof log.date === 'string') completed.add(log.date);
  }

  let cursor = todayKey;
  if (!completed.has(cursor)) {
    // Nothing logged today yet — the streak can still be alive if yesterday
    // was completed and the streak is "pending" until the day ends.
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}