export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getClientTimeZone(): string {
  if (typeof Intl === 'undefined') return 'UTC';
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function appendTimeZone(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}timeZone=${encodeURIComponent(getClientTimeZone())}`;
}

export function toCalendarDateKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const datePrefix = /^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/.exec(value);
  if (datePrefix) {
    const parsedDate = new Date(`${datePrefix[1]}T00:00:00.000Z`);
    return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().startsWith(datePrefix[1])
      ? datePrefix[1]
      : null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function calendarDateToLocalDate(
  value: string | Date | null | undefined,
  endOfDay = false,
): Date | null {
  const key = toCalendarDateKey(value);
  if (!key) return null;
  const [year, month, day] = key.split('-').map(Number);
  const localDate = new Date(0);
  localDate.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  localDate.setFullYear(year, month - 1, day);
  return localDate;
}

export function formatCalendarDate(
  value: string | Date | null | undefined,
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
): string {
  return calendarDateToLocalDate(value)?.toLocaleDateString(locales, options) ?? '';
}
