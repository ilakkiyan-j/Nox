import { HttpError } from './http';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getTimeZone(value: unknown): string {
  if (value === undefined) return 'UTC';
  if (typeof value !== 'string' || value.length > 100) {
    throw new HttpError('timeZone must be a valid IANA time zone', 400);
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    throw new HttpError('timeZone must be a valid IANA time zone', 400);
  }
}

export function calendarDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateOnlyKey(date: Date): string {
  return calendarDateKey(date);
}

export function zonedDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateOnlyFromKey(key: string): Date {
  if (!DATE_KEY_PATTERN.test(key)) {
    throw new HttpError('Date key must use YYYY-MM-DD format', 400);
  }
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || calendarDateKey(date) !== key) {
    throw new HttpError('Date key must be a valid calendar date', 400);
  }
  return date;
}

export function zonedMidnightUtc(key: string, timeZone: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day);
  let candidate = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(candidate));
    const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
    const representedAsUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );
    const offset = representedAsUtc - Math.floor(candidate / 1000) * 1000;
    const adjusted = target - offset;
    if (adjusted === candidate) break;
    candidate = adjusted;
  }

  return new Date(candidate);
}

export function zonedDayBounds(now: Date, timeZone: string): { dayKey: string; start: Date; end: Date } {
  const dayKey = zonedDateKey(now, timeZone);
  const start = zonedMidnightUtc(dayKey, timeZone);
  const [year, month, day] = dayKey.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextKey = calendarDateKey(nextDate);
  const nextStart = zonedMidnightUtc(nextKey, timeZone);
  return { dayKey, start, end: new Date(nextStart.getTime() - 1) };
}

export function formatDateOnly(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(date);
}

export function formatInstant(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(date);
}
