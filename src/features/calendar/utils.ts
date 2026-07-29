export const CALENDAR_URL = '/calendar';

// Monday-first day index (0 = Monday … 6 = Sunday).
const mondayIndex = (date: Date): number => (date.getDay() + 6) % 7;

// The first day of the 6-week grid that contains the given month.
export const startOfMonthGrid = (year: number, month: number): Date => {
  const first = new Date(year, month, 1);
  return new Date(year, month, 1 - mondayIndex(first));
};

// 42 consecutive days (6 weeks) covering the month grid.
export const monthGridDays = (year: number, month: number): Date[] => {
  const start = startOfMonthGrid(year, month);
  return Array.from(
    { length: 42 },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
};

// UTC range covering the visible grid, for the CalendarEvent/query filter.
export const monthQueryRange = (
  year: number,
  month: number,
): { after: string; before: string } => {
  const start = startOfMonthGrid(year, month);
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 42,
  );
  return { after: start.toISOString(), before: end.toISOString() };
};

export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const toDateInput = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

export const toTimeInput = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
    2,
    '0',
  )}`;

export type CalendarView = 'day' | 'week' | 'month' | 'year';

export const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Monday of the week containing `d`.
export const startOfWeek = (d: Date): Date =>
  addDays(startOfDay(d), -mondayIndex(d));

export const weekDays = (d: Date): Date[] => {
  const s = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

export const sameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

// The 12 first-of-month dates for a year (for the year overview).
export const monthsOfYear = (year: number): Date[] =>
  Array.from({ length: 12 }, (_, m) => new Date(year, m, 1));

// UTC [after, before) window to query for the currently visible view.
export const viewRange = (
  view: CalendarView,
  cursor: Date,
): { after: string; before: string } => {
  if (view === 'day') {
    const s = startOfDay(cursor);
    return { after: s.toISOString(), before: addDays(s, 1).toISOString() };
  }
  if (view === 'week') {
    const s = startOfWeek(cursor);
    return { after: s.toISOString(), before: addDays(s, 7).toISOString() };
  }
  if (view === 'year') {
    const s = new Date(cursor.getFullYear(), 0, 1);
    const e = new Date(cursor.getFullYear() + 1, 0, 1);
    return { after: s.toISOString(), before: e.toISOString() };
  }
  return monthQueryRange(cursor.getFullYear(), cursor.getMonth());
};

// Move the focal date by one unit of the current view.
export const shiftCursor = (
  view: CalendarView,
  cursor: Date,
  delta: number,
): Date => {
  if (view === 'day') return addDays(cursor, delta);
  if (view === 'week') return addDays(cursor, delta * 7);
  if (view === 'year')
    return new Date(cursor.getFullYear() + delta, cursor.getMonth(), 1);
  return new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
};

// Human label for the header, e.g. "August 2026" or "Jul 28 – Aug 3, 2026".
export const rangeLabel = (view: CalendarView, cursor: Date): string => {
  if (view === 'day') {
    return cursor.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  if (view === 'week') {
    const days = weekDays(cursor);
    const a = days[0];
    const b = days[6];
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(
      undefined,
      opts,
    )}, ${b.getFullYear()}`;
  }
  if (view === 'year') return String(cursor.getFullYear());
  return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
