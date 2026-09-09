describe('Habit Streak Logic Unit Tests', () => {
  function calculateStreak(logs: { date: string; status: string }[], targetCount = 1) {
    if (!logs || logs.length === 0) return 0;
    const sortedLogs = [...logs].sort((a, b) => (a.date > b.date ? -1 : 1));
    let currentStreak = 0;

    for (const log of sortedLogs) {
      if (log.status === 'COMPLETED') {
        currentStreak += 1;
      } else {
        break;
      }
    }
    return currentStreak;
  }

  test('should calculate zero streak for empty habit logs', () => {
    expect(calculateStreak([])).toBe(0);
  });

  test('should calculate streak for consecutive completed days', () => {
    const logs = [
      { date: '2026-09-08', status: 'COMPLETED' },
      { date: '2026-09-07', status: 'COMPLETED' },
      { date: '2026-09-06', status: 'COMPLETED' },
    ];
    expect(calculateStreak(logs)).toBe(3);
  });

  test('should stop streak count on non-completed log status', () => {
    const logs = [
      { date: '2026-09-08', status: 'COMPLETED' },
      { date: '2026-09-07', status: 'SKIPPED' },
      { date: '2026-09-06', status: 'COMPLETED' },
    ];
    expect(calculateStreak(logs)).toBe(1);
  });
});
