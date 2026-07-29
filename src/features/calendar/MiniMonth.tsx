import { JSX, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MONTHS, monthGridDays, sameDay } from './utils';

type MiniMonthProps = {
  selected: Date;
  today: Date;
  onSelect: (date: Date) => void;
};

// Compact month navigator for the sidebar. Follows the main view's focal date
// but can be paged independently; clicking a day jumps the main view there.
function MiniMonth({ selected, today, onSelect }: MiniMonthProps): JSX.Element {
  const [shown, setShown] = useState({
    year: selected.getFullYear(),
    month: selected.getMonth(),
  });

  useEffect(() => {
    setShown({ year: selected.getFullYear(), month: selected.getMonth() });
  }, [selected]);

  const days = monthGridDays(shown.year, shown.month);
  const shift = (delta: number) =>
    setShown((s) => {
      const d = new Date(s.year, s.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className="p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">
          {MONTHS[shown.month].slice(0, 3)} {shown.year}
        </span>
        <div className="flex">
          <button
            type="button"
            className="hover:bg-muted rounded p-1"
            aria-label="Previous month"
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="hover:bg-muted rounded p-1"
            aria-label="Next month"
            onClick={() => shift(1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((wd, i) => (
          <div
            key={i}
            className="text-muted-foreground text-center text-[10px]"
          >
            {wd}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === shown.month;
          const isToday = sameDay(day, today);
          const isSelected = sameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                'flex h-6 items-center justify-center rounded text-[11px] hover:bg-muted',
                !inMonth && 'text-muted-foreground/40',
                isSelected && !isToday && 'bg-primary/15 text-primary',
                isToday && 'bg-primary text-primary-foreground font-semibold',
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MiniMonth;
