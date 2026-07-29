import { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  CalendarEvent,
  destroyEvent,
  eventEnd,
  eventLocation,
  eventStart,
  saveEvent,
} from '../../lib/jmapCalendar';
import { getLoginPayload, selectCalendarsAccountId } from '../login/loginSlice';
import Availability from './Availability';
import { toDateInput, toTimeInput } from './utils';

type EventFormProps = {
  calendarId: string;
  onSaved: () => void;
  trigger?: ReactNode;
  // Controlled mode: when `open` is provided, the parent owns visibility (used
  // for click-to-create on the day/week grids). Otherwise the trigger toggles it.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  event?: CalendarEvent;
  defaultDate?: Date;
  defaultStartTime?: string;
  defaultEndTime?: string;
  // When more than one calendar exists, let the user choose which one.
  calendars?: Calendar[];
};

const firstCalendarId = (event?: CalendarEvent): string | undefined =>
  event?.calendarIds ? Object.keys(event.calendarIds)[0] : undefined;

function EventForm({
  trigger,
  calendarId,
  event,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  calendars,
  onSaved,
  open: controlledOpen,
  onOpenChange,
}: EventFormProps) {
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);
  const accountId = useSelector(selectCalendarsAccountId);

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  const [selectedCalendarId, setSelectedCalendarId] = useState(calendarId);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (event) {
      const start = eventStart(event);
      const end = eventEnd(event);
      setSelectedCalendarId(firstCalendarId(event) || calendarId);
      setTitle(event.title || '');
      setAllDay(!!event.showWithoutTime);
      setDate(start ? toDateInput(start) : toDateInput(new Date()));
      setStartTime(start ? toTimeInput(start) : '09:00');
      setEndTime(end ? toTimeInput(end) : '10:00');
      setLocation(eventLocation(event));
      setDescription(event.description || '');
    } else {
      const base = defaultDate ?? new Date();
      setSelectedCalendarId(calendarId);
      setTitle('');
      setAllDay(false);
      setDate(toDateInput(base));
      setStartTime(defaultStartTime || '09:00');
      setEndTime(defaultEndTime || '10:00');
      setLocation('');
      setDescription('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSave = async () => {
    if (saving || title.trim() === '') return;
    setSaving(true);
    setError('');
    const result = await saveEvent(
      apiUrl,
      accountId,
      selectedCalendarId,
      {
        title: title.trim(),
        date,
        startTime,
        endTime,
        allDay,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      },
      authorizationHeader,
      event?.id,
    );
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit event' : 'New event'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          {calendars && calendars.length > 1 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-calendar">Calendar</Label>
              <Select
                value={selectedCalendarId}
                onValueChange={setSelectedCalendarId}
              >
                <SelectTrigger id="event-calendar" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allDay}
              onCheckedChange={(v) => setAllDay(v === true)}
            />
            <span>All day</span>
          </label>
          {!allDay && (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="event-start">Start</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="event-end">End</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}
          {!allDay && <Availability date={date} excludeEventId={event?.id} />}
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-desc">Description</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {event ? (
            <Button
              variant="destructive"
              onClick={async () => {
                await destroyEvent(
                  apiUrl,
                  accountId,
                  event.id,
                  authorizationHeader,
                );
                setOpen(false);
                onSaved();
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={onSave} disabled={saving || title.trim() === ''}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EventForm;
