import { JSX, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ImportButton from '@/components/ImportButton';
import {
  CalendarEvent,
  fetchCalendars,
  fetchEvents,
  importEvents,
} from '../../lib/jmapCalendar';
import {
  getLoginPayload,
  selectCalendarsAccountId,
  selectHasCalendarsImport,
  selectUploadUrl,
} from '../login/loginSlice';
import CalendarList from './CalendarList';
import EventForm from './EventForm';
import MiniMonth from './MiniMonth';
import MonthView from './MonthView';
import TimeGridView from './TimeGridView';
import YearView from './YearView';
import { calendarColorMap, colorForEvent } from './eventColor';
import {
  CalendarView,
  rangeLabel,
  shiftCursor,
  startOfDay,
  viewRange,
  weekDays,
} from './utils';

const VIEWS: CalendarView[] = ['day', 'week', 'month', 'year'];

type FormState = {
  open: boolean;
  event?: CalendarEvent;
  date?: Date;
  startTime?: string;
  endTime?: string;
};

function Layout(): JSX.Element {
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);
  const accountId = useSelector(selectCalendarsAccountId);
  const uploadUrl = useSelector(selectUploadUrl);
  const canImport = useSelector(selectHasCalendarsImport);
  const queryClient = useQueryClient();

  const today = new Date();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState<Date>(startOfDay(today));
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<FormState>({ open: false });

  const calendarsQuery = useQuery({
    queryKey: ['calendars', accountId],
    queryFn: async () => {
      const r = await fetchCalendars(apiUrl, accountId, authorizationHeader);
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: !!accountId,
  });

  const range = viewRange(view, cursor);
  const eventsQuery = useQuery({
    queryKey: ['events', accountId, range.after, range.before],
    queryFn: async () => {
      const r = await fetchEvents(
        apiUrl,
        accountId,
        authorizationHeader,
        range.after,
        range.before,
      );
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: !!accountId,
  });

  const calendars = calendarsQuery.data ?? [];
  const defaultCalendar = calendars.find((c) => c.isDefault) ?? calendars[0];
  const calendarId = defaultCalendar?.id ?? '';
  const colorMap = calendarColorMap(calendars);
  const colorFor = (event: CalendarEvent) => colorForEvent(event, colorMap);

  const allEvents = eventsQuery.data ?? [];
  // Keep events whose (first) calendar is not toggled off.
  const events = allEvents.filter((e) => {
    const ids = e.calendarIds ? Object.keys(e.calendarIds) : [];
    if (ids.length === 0) return true;
    return ids.some((id) => !hidden[id]);
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['events', accountId] });

  const toggleCalendar = (id: string) =>
    setHidden((h) => ({ ...h, [id]: !h[id] }));

  const onNewAt = (date: Date, startTime?: string) => {
    let endTime: string | undefined;
    if (startTime) {
      const hour = parseInt(startTime.slice(0, 2), 10);
      endTime =
        hour >= 23 ? '23:59' : `${String(hour + 1).padStart(2, '0')}:00`;
    }
    setForm({ open: true, event: undefined, date, startTime, endTime });
  };
  const onEditEvent = (event: CalendarEvent) => setForm({ open: true, event });
  const onOpenDay = (date: Date) => {
    setCursor(startOfDay(date));
    setView('day');
  };
  const onOpenMonth = (date: Date) => {
    setCursor(startOfDay(date));
    setView('month');
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside className="bg-sidebar hidden w-60 shrink-0 flex-col overflow-y-auto border-r md:flex">
        <MiniMonth selected={cursor} today={today} onSelect={onOpenDay} />
        <Separator />
        {calendars.length > 0 && (
          <CalendarList
            calendars={calendars}
            hidden={hidden}
            onToggle={toggleCalendar}
          />
        )}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
          <h1 className="min-w-0 truncate text-lg font-semibold">
            {rangeLabel(view, cursor)}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous"
            onClick={() => setCursor((c) => shiftCursor(view, c, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next"
            onClick={() => setCursor((c) => shiftCursor(view, c, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(startOfDay(new Date()))}
          >
            Today
          </Button>

          <div className="flex-1" />

          <div className="flex rounded-md border p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs capitalize',
                  view === v
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {canImport && calendarId && uploadUrl && (
            <ImportButton
              accept=".ics,text/calendar"
              label="Import .ics"
              importer={(file) =>
                importEvents(
                  apiUrl,
                  accountId,
                  uploadUrl,
                  calendarId,
                  file,
                  authorizationHeader,
                )
              }
              onImported={refresh}
            />
          )}

          {calendarId && (
            <Button size="sm" onClick={() => onNewAt(cursor)}>
              <Plus className="h-4 w-4" />
              New event
            </Button>
          )}
        </div>

        {view === 'month' && (
          <MonthView
            cursor={cursor}
            today={today}
            events={events}
            colorFor={colorFor}
            onNewAt={onNewAt}
            onEditEvent={onEditEvent}
            onOpenDay={onOpenDay}
          />
        )}
        {view === 'week' && (
          <TimeGridView
            days={weekDays(cursor)}
            today={today}
            events={events}
            colorFor={colorFor}
            onNewAt={onNewAt}
            onEditEvent={onEditEvent}
          />
        )}
        {view === 'day' && (
          <TimeGridView
            days={[startOfDay(cursor)]}
            today={today}
            events={events}
            colorFor={colorFor}
            onNewAt={onNewAt}
            onEditEvent={onEditEvent}
          />
        )}
        {view === 'year' && (
          <YearView
            cursor={cursor}
            today={today}
            events={events}
            onOpenDay={onOpenDay}
            onOpenMonth={onOpenMonth}
          />
        )}
      </div>

      {calendarId && (
        <EventForm
          calendarId={calendarId}
          calendars={calendars}
          event={form.event}
          defaultDate={form.date}
          defaultStartTime={form.startTime}
          defaultEndTime={form.endTime}
          open={form.open}
          onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

export default Layout;
