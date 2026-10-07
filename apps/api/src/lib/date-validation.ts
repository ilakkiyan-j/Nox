import { HttpError } from './http';

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseDateInput(value: unknown, fieldName = 'Date'): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(`${fieldName} must be a valid date string`, 400);
  }

  const raw = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    if (!isValidCalendarDate(year, month, day)) {
      throw new HttpError(`${fieldName} must be a valid calendar date`, 400);
    }
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    return date;
  }

  const datePrefix = /^(\d{4})-(\d{2})-(\d{2})(?=T|\s)/.exec(raw);
  if (
    datePrefix &&
    !isValidCalendarDate(Number(datePrefix[1]), Number(datePrefix[2]), Number(datePrefix[3]))
  ) {
    throw new HttpError(`${fieldName} must be a valid calendar date`, 400);
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(`${fieldName} must be a valid date string`, 400);
  }
  return date;
}
