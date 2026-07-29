import { CSSProperties } from 'react';
import { Calendar, CalendarEvent } from '../../lib/jmapCalendar';

/** The colour of the first calendar an event belongs to, if any. */
export const colorForEvent = (
  event: CalendarEvent,
  calendarColors: Record<string, string>,
): string | undefined => {
  const id = event.calendarIds ? Object.keys(event.calendarIds)[0] : undefined;
  return id ? calendarColors[id] : undefined;
};

/** Map of calendarId → colour, skipping calendars without one. */
export const calendarColorMap = (
  calendars: Calendar[],
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const c of calendars) {
    if (c.color) map[c.id] = c.color;
  }
  return map;
};

// Tint an event chip with its calendar colour (translucent fill + solid text);
// callers fall back to theme classes when no colour is returned.
export const chipStyle = (color?: string): CSSProperties | undefined =>
  color ? { backgroundColor: `${color}22`, color } : undefined;
