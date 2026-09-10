import { computeBestStreak, computeCurrentStreak, dateToKey, addDays } from '../../src/lib/streaks';

describe('Habit streak calculation', () => {
  test('empty logs yield zero streak', () => {
    expect(computeCurrentStreak([], '2026-09-10')).toBe(0);
    expect(computeBestStreak([])).toBe(0);
  });

  test('consecutive completed days produce a streak', () => {
    const logs = [
      { date: '2026-09-08', status: 'COMPLETED' },
      { date: '2026-09-07', status: 'COMPLETED' },
      { date: '2026-09-06', status: 'COMPLETED' },
    ];
    // Today is 09-09; the habit was last logged yesterday (09-08).
    expect(computeCurrentStreak(logs, '2026-09-09')).toBe(3);
    expect(computeBestStreak(logs)).toBe(3);
  });

  test('streak counts today when already logged today', () => {
    const logs = [
      { date: '2026-09-10', status: 'COMPLETED' },
      { date: '2026-09-09', status: 'COMPLETED' },
      { date: '2026-09-08', status: 'COMPLETED' },
    ];
    expect(computeCurrentStreak(logs, '2026-09-10')).toBe(3);
    expect(computeBestStreak(logs)).toBe(3);
  });

  test('gap breaks the streak but not the best streak', () => {
    const logs = [
      { date: '2026-09-10', status: 'COMPLETED' },
      { date: '2026-09-09', status: 'COMPLETED' },
      { date: '2026-09-07', status: 'COMPLETED' },
      { date: '2026-09-06', status: 'COMPLETED' },
    ];
    expect(computeCurrentStreak(logs, '2026-09-10')).toBe(2);
    expect(computeBestStreak(logs)).toBe(2); // 09-10..09-09 and 09-07..09-06
  });

  test('skipped days break the current streak', () => {
    const logs = [
      { date: '2026-09-08', status: 'COMPLETED' },
      { date: '2026-09-07', status: 'SKIPPED' },
      { date: '2026-09-06', status: 'COMPLETED' },
    ];
    expect(computeCurrentStreak(logs, '2026-09-09')).toBe(1);
    expect(computeBestStreak(logs)).toBe(1);
  });

  test('streak survives until the end of today when nothing logged today', () => {
    const logs = [
      { date: '2026-09-08', status: 'COMPLETED' },
      { date: '2026-09-07', status: 'COMPLETED' },
    ];
    // Today is 09-09 and not logged yet — streak of 2 pending through today.
    expect(computeCurrentStreak(logs, '2026-09-09')).toBe(2);
  });

  test('streak breaks when today is missed and nothing logged yesterday', () => {
    const logs = [{ date: '2026-09-06', status: 'COMPLETED' }];
    expect(computeCurrentStreak(logs, '2026-09-09')).toBe(0);
  });

  test('dateKey/addDays helpers are consistent', () => {
    expect(dateToKey(new Date(2026, 8, 10))).toBe('2026-09-10');
    expect(addDays('2026-09-10', -1)).toBe('2026-09-09');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});