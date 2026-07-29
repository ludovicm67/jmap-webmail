import { JSX } from 'react';
import { cn } from '@/lib/utils';
import {
  CalendarEvent,
  eventEnd,
  eventStart,
  eventLocation,
} from '../../lib/jmapCalendar';
import { chipStyle } from './eventColor';
import { HOURS, sameDay, toTimeInput } from './utils';

const HOUR_PX = 48;
const pad = (n: number) => String(n).padStart(2, '0');

type TimeGridViewProps = {
  days: Date[]; // 1 day (day view) or 7 days (week view)
  today: Date;
  events: CalendarEvent[];
  colorFor: (event: CalendarEvent) => string | undefined;
  onNewAt: (date: Date, startTime: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
};

const minutesOfDay = (d: Date): number => d.getHours() * 60 + d.getMinutes();

function TimeGridView({
  days,
  today,
  events,
  colorFor,
  onNewAt,
  onEditEvent,
}: TimeGridViewProps): JSX.Element {
  const onDay = (day: Date, allDay: boolean) =>
    events
      .filter((e) => {
        const start = eventStart(e);
        return start && sameDay(start, day) && !!e.showWithoutTime === allDay;
      })
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  const anyAllDay = days.some((d) => onDay(d, true).length > 0);

  const position = (event: CalendarEvent) => {
    const start = eventStart(event)!;
    const end = eventEnd(event) ?? new Date(start.getTime() + 3600000);
    const startMin = minutesOfDay(start);
    const endMin = sameDay(start, end) ? minutesOfDay(end) : 24 * 60;
    const top = (startMin / 60) * HOUR_PX;
    const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 20);
    return { top, height };
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day headers */}
      <div className="flex shrink-0 border-b">
        <div className="w-14 shrink-0" />
        {days.map((d) => {
          const isToday = sameDay(d, today);
          return (
            <div
              key={d.toISOString()}
              className="flex-1 border-l px-2 py-1 text-center"
            >
              <div className="text-muted-foreground text-xs">
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
              <div
                className={cn(
                  'text-sm',
                  isToday && 'text-primary font-semibold',
                )}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day band */}
      {anyAllDay && (
        <div className="flex shrink-0 border-b">
          <div className="text-muted-foreground w-14 shrink-0 pt-1 pr-1 text-right text-[10px]">
            all-day
          </div>
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className="flex flex-1 flex-col gap-0.5 border-l p-1"
            >
              {onDay(d, true).map((event) => {
                const color = colorFor(event);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEditEvent(event)}
                    style={chipStyle(color)}
                    className={cn(
                      'truncate rounded px-1 py-0.5 text-left text-xs',
                      !color &&
                        'bg-primary/15 text-primary hover:bg-primary/25',
                    )}
                  >
                    {event.title || '(untitled)'}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Hour grid */}
      <div className="flex flex-1 overflow-auto">
        <div className="w-14 shrink-0">
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_PX }}
              className="text-muted-foreground border-b pr-1 text-right text-[10px]"
            >
              {pad(h)}:00
            </div>
          ))}
        </div>
        {days.map((d) => (
          <div key={d.toISOString()} className="relative flex-1 border-l">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                aria-label={`New event at ${pad(h)}:00`}
                style={{ height: HOUR_PX }}
                className="hover:bg-muted/50 block w-full border-b"
                onClick={() => onNewAt(d, `${pad(h)}:00`)}
              />
            ))}
            {onDay(d, false).map((event) => {
              const { top, height } = position(event);
              const start = eventStart(event);
              const color = colorFor(event);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEditEvent(event)}
                  style={{ top, height, ...chipStyle(color) }}
                  className={cn(
                    'absolute right-0.5 left-0.5 overflow-hidden rounded px-1 py-0.5 text-left text-xs',
                    !color &&
                      'bg-primary/20 text-primary hover:bg-primary/30 border-primary/40 border',
                  )}
                >
                  <div className="truncate font-medium">
                    {event.title || '(untitled)'}
                  </div>
                  {start && (
                    <div className="truncate opacity-80">
                      {toTimeInput(start)}
                      {eventLocation(event) ? ` · ${eventLocation(event)}` : ''}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TimeGridView;
