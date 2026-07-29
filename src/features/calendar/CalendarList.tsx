import { JSX } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '../../lib/jmapCalendar';

type CalendarListProps = {
  calendars: Calendar[];
  hidden: Record<string, boolean>;
  onToggle: (calendarId: string) => void;
};

// "My calendars" — toggle which calendars' events are shown.
function CalendarList({
  calendars,
  hidden,
  onToggle,
}: CalendarListProps): JSX.Element {
  return (
    <div className="p-2">
      <div className="text-muted-foreground px-1 pb-1 text-xs font-medium">
        My calendars
      </div>
      <ul className="flex flex-col">
        {calendars.map((c) => (
          <li key={c.id}>
            <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm">
              <Checkbox
                checked={!hidden[c.id]}
                onCheckedChange={() => onToggle(c.id)}
              />
              <span
                className="h-3 w-3 shrink-0 rounded-full border"
                style={{ backgroundColor: c.color || 'var(--primary)' }}
              />
              <span className="truncate">{c.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CalendarList;
