import { JSX } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { getAvailability } from '../../lib/jmapCalendar';
import {
  getLoginPayload,
  selectCalendarsAccountId,
  selectHasAvailability,
} from '../login/loginSlice';
import { toTimeInput } from './utils';

type AvailabilityProps = {
  date: string; // YYYY-MM-DD
  excludeEventId?: string;
};

// Show the signed-in user's existing busy blocks for the chosen day, so a new
// event can be scheduled around them. Renders nothing when the server does not
// advertise the principals:availability capability.
function Availability({ date }: AvailabilityProps): JSX.Element | null {
  const { apiUrl, authorizationHeader } = useSelector(getLoginPayload);
  const accountId = useSelector(selectCalendarsAccountId);
  const hasAvailability = useSelector(selectHasAvailability);

  const query = useQuery({
    queryKey: ['availability', accountId, date],
    queryFn: async () => {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const r = await getAvailability(
        apiUrl,
        accountId,
        accountId,
        start.toISOString(),
        end.toISOString(),
        authorizationHeader,
      );
      if (!r.success) throw new Error(r.message);
      return r.data;
    },
    enabled: hasAvailability && !!accountId && !!date,
  });

  if (!hasAvailability) return null;

  const intervals = query.data ?? [];

  return (
    <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
      <div className="mb-1 flex items-center gap-1.5 font-medium">
        <CalendarClock className="h-3.5 w-3.5" />
        Your schedule on this day
      </div>
      {query.isLoading ? (
        <span>Checking availability…</span>
      ) : intervals.length === 0 ? (
        <span>No conflicts — you are free all day.</span>
      ) : (
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
          {intervals.map((b, i) => (
            <li key={i}>
              Busy {toTimeInput(new Date(b.utcStart))}–
              {toTimeInput(new Date(b.utcEnd))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Availability;
