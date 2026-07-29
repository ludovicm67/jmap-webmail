import { JSX } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventStart } from '../../lib/jmapCalendar';
import { chipStyle } from './eventColor';
import { WEEKDAYS, monthGridDays, sameDay, toTimeInput } from './utils';

type MonthViewProps = {
  cursor: Date;
  today: Date;
  events: CalendarEvent[];
  colorFor: (event: CalendarEvent) => string | undefined;
  onNewAt: (date: Date) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onOpenDay: (date: Date) => void;
};

function MonthView({
  cursor,
  today,
  events,
  colorFor,
  onNewAt,
  onEditEvent,
  onOpenDay,
}: MonthViewProps): JSX.Element {
  const days = monthGridDays(cursor.getFullYear(), cursor.getMonth());

  const eventsOnDay = (day: Date): CalendarEvent[] =>
    events
      .filter((e) => {
        const start = eventStart(e);
        return start && sameDay(start, day);
      })
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-7 border-b">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-muted-foreground px-2 py-1 text-center text-xs font-medium"
          >
            {wd}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-auto">
        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const dayEvents = eventsOnDay(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'group flex min-h-24 flex-col gap-1 border-r border-b p-1',
                !inMonth && 'bg-muted/40 text-muted-foreground',
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenDay(day)}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-muted',
                    isToday &&
                      'bg-primary text-primary-foreground font-semibold hover:bg-primary',
                  )}
                >
                  {day.getDate()}
                </button>
                <button
                  type="button"
                  onClick={() => onNewAt(day)}
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                  aria-label="Add event"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.map((event) => {
                  const start = eventStart(event);
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
                      {!event.showWithoutTime && start
                        ? `${toTimeInput(start)} `
                        : ''}
                      {event.title || '(untitled)'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;
