import {
  JMAP_AVAILABILITY,
  JMAP_CALENDARS,
  JMAP_CALENDARS_PARSE,
  JMAP_CORE,
  JMAP_PRINCIPALS,
  JMAPResponse,
  parseSetResponse,
  postJmap,
  uploadBlob,
} from './jmap';

export type Calendar = {
  id: string;
  name: string;
  color?: string | null;
  isDefault?: boolean;
};

// A practical subset of the JSCalendar Event object.
export type CalendarEvent = {
  id: string;
  calendarIds?: Record<string, boolean>;
  title?: string;
  description?: string | null;
  start?: string; // local date-time, e.g. "2026-08-01T10:00:00"
  duration?: string; // ISO 8601 duration, e.g. "PT1H"
  timeZone?: string | null;
  showWithoutTime?: boolean;
  locations?: Record<string, { name?: string }>;
};

const auth = (header: string) => ({ Authorization: header });

export const fetchCalendars = async (
  apiUrl: string,
  accountId: string,
  header: string,
): Promise<JMAPResponse<Calendar[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CALENDARS],
      methodCalls: [['Calendar/get', { accountId, ids: null }, '0']],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { list?: Calendar[] }] | undefined;
  if (!m || m[0] !== 'Calendar/get' || !Array.isArray(m[1]?.list)) {
    return { success: false, message: 'could not fetch calendars' };
  }
  return { success: true, data: m[1].list };
};

// Events whose start falls in [after, before) (UTC ISO strings).
export const fetchEvents = async (
  apiUrl: string,
  accountId: string,
  header: string,
  after: string,
  before: string,
): Promise<JMAPResponse<CalendarEvent[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CALENDARS],
      methodCalls: [
        [
          'CalendarEvent/query',
          { accountId, filter: { after, before }, limit: 500 },
          '0',
        ],
        [
          'CalendarEvent/get',
          {
            accountId,
            '#ids': {
              resultOf: '0',
              name: 'CalendarEvent/query',
              path: '/ids',
            },
            properties: [
              'calendarIds',
              'title',
              'description',
              'start',
              'duration',
              'timeZone',
              'showWithoutTime',
              'locations',
            ],
          },
          '1',
        ],
      ],
    },
    auth(header),
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[1] as
    [string, { list?: CalendarEvent[] }] | undefined;
  if (!m || m[0] !== 'CalendarEvent/get' || !Array.isArray(m[1]?.list)) {
    return { success: false, message: 'could not fetch events' };
  }
  return { success: true, data: m[1].list };
};

export type EventInput = {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  allDay: boolean;
  location?: string;
  description?: string;
};

const durationBetween = (startTime: string, endTime: string): string => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    minutes = 60;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  // minutes is clamped to >= 1 above, so at least one part is present.
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
};

const toEvent = (
  input: EventInput,
  calendarId: string,
): Record<string, unknown> => {
  const event: Record<string, unknown> = {
    '@type': 'Event',
    calendarIds: { [calendarId]: true },
    title: input.title,
  };
  if (input.allDay) {
    event.start = `${input.date}T00:00:00`;
    event.showWithoutTime = true;
    event.duration = 'P1D';
  } else {
    event.start = `${input.date}T${input.startTime}:00`;
    event.duration = durationBetween(input.startTime, input.endTime);
    event.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  if (input.location) {
    event.locations = { l0: { name: input.location } };
  }
  if (input.description) {
    event.description = input.description;
  }
  return event;
};

export const saveEvent = async (
  apiUrl: string,
  accountId: string,
  calendarId: string,
  input: EventInput,
  header: string,
  eventId?: string,
): Promise<JMAPResponse<true>> => {
  const event = toEvent(input, calendarId);
  const body = eventId
    ? { update: { [eventId]: event } }
    : { create: { e: event } };
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CALENDARS],
      methodCalls: [['CalendarEvent/set', { accountId, ...body }, '0']],
    },
    auth(header),
  );
  return parseSetResponse(
    json,
    'CalendarEvent/set',
    eventId ? 'updated' : 'created',
    eventId ?? 'e',
  );
};

/**
 * Import events from an uploaded .ics file: upload → `CalendarEvent/parse` →
 * create the parsed events into `calendarId`. Returns how many were created.
 */
export const importEvents = async (
  apiUrl: string,
  accountId: string,
  uploadUrl: string,
  calendarId: string,
  file: Blob,
  header: string,
): Promise<JMAPResponse<number>> => {
  const up = await uploadBlob(uploadUrl, accountId, file, 'text/calendar', {
    Authorization: header,
  });
  if (!up.success) return up;

  const parsed = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CALENDARS, JMAP_CALENDARS_PARSE],
      methodCalls: [
        ['CalendarEvent/parse', { accountId, blobIds: [up.data.blobId] }, '0'],
      ],
    },
    { Authorization: header },
  );
  const pm = (parsed?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { parsed?: Record<string, CalendarEvent[]> }] | undefined;
  const list = pm?.[1]?.parsed?.[up.data.blobId];
  if (!Array.isArray(list) || list.length === 0) {
    return { success: false, message: 'no events were found in the file' };
  }

  const create: Record<string, Record<string, unknown>> = {};
  list.forEach((ev, i) => {
    create[`e${i}`] = {
      '@type': 'Event',
      calendarIds: { [calendarId]: true },
      title: ev.title || '(untitled)',
      start: ev.start,
      duration: ev.duration,
      timeZone: ev.timeZone ?? null,
      showWithoutTime: ev.showWithoutTime,
      locations: ev.locations,
      description: ev.description,
    };
  });
  const res = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CALENDARS],
      methodCalls: [['CalendarEvent/set', { accountId, create }, '0']],
    },
    { Authorization: header },
  );
  const rm = (res?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { created?: Record<string, unknown> }] | undefined;
  const count = rm?.[1]?.created ? Object.keys(rm[1].created).length : 0;
  return { success: true, data: count };
};

export const destroyEvent = async (
  apiUrl: string,
  accountId: string,
  eventId: string,
  header: string,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_CALENDARS],
      methodCalls: [
        ['CalendarEvent/set', { accountId, destroy: [eventId] }, '0'],
      ],
    },
    auth(header),
  );
  return parseSetResponse(json, 'CalendarEvent/set', 'destroyed', eventId);
};

// --- helpers ---
export const parseDurationMinutes = (duration?: string): number => {
  if (!duration) return 60;
  const m = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 60;
  const [, d, h, min] = m;
  return (
    Number(d || 0) * 24 * 60 + Number(h || 0) * 60 + Number(min || 0) || 60
  );
};

export const eventStart = (event: CalendarEvent): Date | null => {
  if (!event.start) return null;
  const date = new Date(event.start);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const eventEnd = (event: CalendarEvent): Date | null => {
  const start = eventStart(event);
  if (!start) return null;
  return new Date(
    start.getTime() + parseDurationMinutes(event.duration) * 60000,
  );
};

export const eventLocation = (event: CalendarEvent): string =>
  Object.values(event.locations ?? {})[0]?.name || '';

export type BusyInterval = {
  utcStart: string;
  utcEnd: string;
  busyStatus?: string;
};

/**
 * Free/busy for a principal over a window, via `Principal/getAvailability`.
 * For the signed-in user the principal id equals their account id.
 * See draft-ietf-jmap-calendars (principals:availability).
 */
export const getAvailability = async (
  apiUrl: string,
  accountId: string,
  principalId: string,
  utcStart: string,
  utcEnd: string,
  header: string,
): Promise<JMAPResponse<BusyInterval[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_PRINCIPALS, JMAP_AVAILABILITY],
      methodCalls: [
        [
          'Principal/getAvailability',
          { accountId, id: principalId, utcStart, utcEnd },
          '0',
        ],
      ],
    },
    { Authorization: header },
  );
  const m = (json?.methodResponses as unknown[] | undefined)?.[0] as
    [string, { list?: BusyInterval[] }] | undefined;
  if (
    !m ||
    m[0] !== 'Principal/getAvailability' ||
    !Array.isArray(m[1]?.list)
  ) {
    return { success: false, message: 'could not fetch availability' };
  }
  return { success: true, data: m[1].list };
};
