import {
  dateOnlyFromKey,
  dateOnlyKey,
  getTimeZone,
  zonedDayBounds,
  zonedDateKey,
  zonedMidnightUtc,
} from '../../src/lib/timezone';

describe('timezone date helpers', () => {
  test('uses the supplied timezone to determine the current calendar date', () => {
    const instant = new Date('2026-10-08T00:30:00.000Z');

    expect(zonedDateKey(instant, 'America/Los_Angeles')).toBe('2026-10-07');
    expect(zonedDateKey(instant, 'Asia/Kolkata')).toBe('2026-10-08');
    expect(zonedDateKey(instant, 'Pacific/Kiritimati')).toBe('2026-10-08');
  });

  test('calculates day bounds across a daylight-saving transition', () => {
    const now = new Date('2026-03-08T16:00:00.000Z');
    const bounds = zonedDayBounds(now, 'America/Los_Angeles');

    expect(bounds.dayKey).toBe('2026-03-08');
    expect(bounds.start.toISOString()).toBe('2026-03-08T08:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-03-09T06:59:59.999Z');
    expect(bounds.end.getTime() - bounds.start.getTime() + 1).toBe(23 * 60 * 60 * 1000);
  });

  test('includes the repeated hour when daylight saving time ends', () => {
    const bounds = zonedDayBounds(new Date('2026-11-01T18:00:00.000Z'), 'America/Los_Angeles');

    expect(bounds.dayKey).toBe('2026-11-01');
    expect(bounds.start.toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-11-02T07:59:59.999Z');
    expect(bounds.end.getTime() - bounds.start.getTime() + 1).toBe(25 * 60 * 60 * 1000);
  });

  test('converts date-only calendar keys independently from the server timezone', () => {
    const date = dateOnlyFromKey('2026-10-08');

    expect(dateOnlyKey(date)).toBe('2026-10-08');
    expect(zonedMidnightUtc('2026-10-08', 'Asia/Kolkata').toISOString()).toBe('2026-10-07T18:30:00.000Z');
  });

  test('rejects invalid timezone and date-key inputs', () => {
    expect(() => getTimeZone(['UTC'])).toThrow('timeZone must be a valid IANA time zone');
    expect(() => getTimeZone('Not/AZone')).toThrow('timeZone must be a valid IANA time zone');
    expect(() => dateOnlyFromKey('2026-02-30')).toThrow('Date key must be a valid calendar date');
  });
});
