import { JSX } from 'react';
import { cn } from '@/lib/utils';
import { CalendarEvent, eventStart } from '../../lib/jmapCalendar';
import { MONTHS, monthGridDays, monthsOfYear, sameDay } from './utils';

type YearViewProps = {
  cursor: Date;
  today: Date;
  events: CalendarEvent[];
  onOpenDay: (date: Date) => void;
  onOpenMonth: (date: Date) => void;
};

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function YearView({
  cursor,
  today,
  events,
  onOpenDay,
  onOpenMonth,
}: YearViewProps): JSX.Element {
  const year = cursor.getFullYear();
  const withEvents = new Set<string>();
  for (const e of events) {
    const s = eventStart(e);
    if (s) withEvents.add(dayKey(s));
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {monthsOfYear(year).map((monthDate) => {
        const days = monthGridDays(year, monthDate.getMonth());
        return (
          <div key={monthDate.getMonth()} className="rounded-md border p-2">
            <button
              type="button"
              onClick={() => onOpenMonth(monthDate)}
              className="hover:text-primary mb-1 w-full text-left text-sm font-semibold"
            >
              {MONTHS[monthDate.getMonth()]}
            </button>
            <div className="grid grid-cols-7 gap-0.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((wd, i) => (
                <div
                  key={i}
                  className="text-muted-foreground text-center text-[9px]"
                >
                  {wd}
                </div>
              ))}
              {days.map((day) => {
                const inMonth = day.getMonth() === monthDate.getMonth();
                const isToday = sameDay(day, today);
                const has = withEvents.has(dayKey(day));
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => onOpenDay(day)}
                    className={cn(
                      'relative flex h-5 items-center justify-center rounded text-[10px] hover:bg-muted',
                      !inMonth && 'text-muted-foreground/40',
                      isToday &&
                        'bg-primary text-primary-foreground font-semibold',
                    )}
                  >
                    {day.getDate()}
                    {has && !isToday && (
                      <span className="bg-primary absolute bottom-0 h-1 w-1 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default YearView;
