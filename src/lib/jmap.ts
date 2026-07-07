import { Base64 } from 'js-base64';
import { Mail, Mailbox } from '../features/mail/types';

export const JMAP_CORE = 'urn:ietf:params:jmap:core';
export const JMAP_MAIL = 'urn:ietf:params:jmap:mail';

export type JmapSession = {
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  eventSourceUrl?: string;
  username?: string;
  state?: string;
  accounts: Record<
    string,
    { name: string; isPersonal: boolean; isReadOnly: boolean }
  >;
  primaryAccounts: Record<string, string>;
};

export const discoverJmapEndpoint = async (domain: string): Promise<string> => {
  const wellKnownURL = `https://${domain}/.well-known/jmap`;
  const response = await fetch(wellKnownURL);
  return response.url;
};

type JMAPResponse<T> =
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      data: T;
    };

/**
 * The Session object may advertise its URLs as relative references (e.g.
 * `/jmap/api/`). Resolve them against the absolute session URL so requests
 * hit the mail server rather than the webmail's own origin. The `{...}`
 * template placeholders used by `downloadUrl` / `uploadUrl` are preserved.
 */
const resolveSessionUrl = (url: string, base: string): string => {
  try {
    return new URL(url, base).href.replace(/%7B/gi, '{').replace(/%7D/gi, '}');
  } catch {
    return url;
  }
};

/**
 * Fetch the JMAP Session object, which advertises the real `apiUrl`,
 * `downloadUrl` and the account ids to use for subsequent requests.
 * See https://www.rfc-editor.org/rfc/rfc8620#section-2
 */
export const fetchSession = async (
  sessionUrl: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<JmapSession>> => {
  let json;
  let baseUrl = sessionUrl;
  try {
    const response = await fetch(sessionUrl, {
      headers: new Headers({ ...headers, 'Content-Type': 'application/json' }),
      method: 'GET',
    });
    // The final URL after any redirects is the correct base for relative refs.
    baseUrl = response.url || sessionUrl;
    json = await response.json();
  } catch {
    return {
      success: false,
      message: 'Unable to reach the JMAP session endpoint.',
    };
  }

  if (!json || !json.apiUrl || !json.primaryAccounts) {
    return {
      success: false,
      message: 'The server did not return a valid JMAP session.',
    };
  }

  const session = json as JmapSession;
  session.apiUrl = resolveSessionUrl(session.apiUrl, baseUrl);
  if (session.downloadUrl) {
    session.downloadUrl = resolveSessionUrl(session.downloadUrl, baseUrl);
  }
  if (session.uploadUrl) {
    session.uploadUrl = resolveSessionUrl(session.uploadUrl, baseUrl);
  }
  if (session.eventSourceUrl) {
    session.eventSourceUrl = resolveSessionUrl(session.eventSourceUrl, baseUrl);
  }

  return {
    success: true,
    data: session,
  };
};

/** Resolve the account id to use for the mail capability. */
export const getMailAccountId = (session: JmapSession): string | undefined => {
  return session.primaryAccounts?.[JMAP_MAIL];
};

const postJmap = async (
  apiUrl: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<Record<string, unknown> | undefined> => {
  try {
    const response = await fetch(apiUrl, {
      headers: new Headers({ ...headers, 'Content-Type': 'application/json' }),
      method: 'POST',
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch {
    return undefined;
  }
};

export const fetchMailboxes = async (
  apiUrl: string,
  accountId: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<Mailbox[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL],
      methodCalls: [['Mailbox/get', { accountId, ids: null }, '0']],
    },
    headers,
  );

  if (!json || !json.methodResponses) {
    return { success: false, message: 'not a valid JMAP response' };
  }

  const methodResponses = json.methodResponses;
  if (
    !methodResponses ||
    !Array.isArray(methodResponses) ||
    methodResponses.length !== 1
  ) {
    return { success: false, message: 'no valid response' };
  }

  const mbx = methodResponses[0];

  if (mbx[0] !== 'Mailbox/get') {
    return { success: false, message: 'not the expected method' };
  }
  if (!mbx[1] || !mbx[1].list || !Array.isArray(mbx[1].list)) {
    return { success: false, message: 'could not fetch mailboxes' };
  }

  return {
    success: true,
    data: mbx[1].list as Mailbox[],
  };
};

export const fetchMails = async (
  apiUrl: string,
  accountId: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<Mail[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL],
      methodCalls: [
        [
          'Email/query',
          {
            accountId,
            sort: [{ property: 'receivedAt', isAscending: false }],
            position: 0,
            limit: 100,
            calculateTotal: true,
          },
          '0',
        ],
        [
          'Email/get',
          {
            accountId,
            '#ids': {
              resultOf: '0',
              name: 'Email/query',
              path: '/ids',
            },
            properties: [
              'threadId',
              'mailboxIds',
              'keywords',
              'hasAttachment',
              'from',
              'to',
              'subject',
              'receivedAt',
              'size',
              'preview',
            ],
          },
          '1',
        ],
      ],
    },
    headers,
  );

  if (!json || !json.methodResponses) {
    return { success: false, message: 'not a valid JMAP response' };
  }

  const methodResponses = json.methodResponses;
  if (
    !methodResponses ||
    !Array.isArray(methodResponses) ||
    methodResponses.length !== 2
  ) {
    return { success: false, message: 'no valid response' };
  }

  const m = methodResponses[1];

  if (m[0] !== 'Email/get') {
    return { success: false, message: 'not the expected method' };
  }
  if (!m[1] || !m[1].list || !Array.isArray(m[1].list)) {
    return { success: false, message: 'could not fetch emails' };
  }

  return {
    success: true,
    data: m[1].list as Mail[],
  };
};

export const fetchMail = async (
  apiUrl: string,
  accountId: string,
  emailId: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<Mail>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL],
      methodCalls: [
        [
          'Email/get',
          {
            accountId,
            ids: [emailId],
            properties: [
              'threadId',
              'mailboxIds',
              'keywords',
              'hasAttachment',
              'from',
              'to',
              'cc',
              'subject',
              'receivedAt',
              'size',
              'preview',
              'textBody',
              'htmlBody',
              'bodyValues',
            ],
            fetchTextBodyValues: true,
            fetchHTMLBodyValues: true,
            maxBodyValueBytes: 1024 * 1024,
          },
          '0',
        ],
      ],
    },
    headers,
  );

  if (!json || !json.methodResponses) {
    return { success: false, message: 'not a valid JMAP response' };
  }

  const methodResponses = json.methodResponses;
  if (
    !methodResponses ||
    !Array.isArray(methodResponses) ||
    methodResponses.length !== 1
  ) {
    return { success: false, message: 'no valid response' };
  }

  const m = methodResponses[0];

  if (m[0] !== 'Email/get') {
    return { success: false, message: 'not the expected method' };
  }
  if (
    !m[1] ||
    !m[1].list ||
    !Array.isArray(m[1].list) ||
    m[1].list.length !== 1
  ) {
    return { success: false, message: 'could not fetch email' };
  }

  return {
    success: true,
    data: m[1].list[0] as Mail,
  };
};

/**
 * Set (or clear) a keyword on an email, e.g. `$seen` to mark it read/unread.
 * See https://www.rfc-editor.org/rfc/rfc8621#section-4.6
 */
export const setEmailKeyword = async (
  apiUrl: string,
  accountId: string,
  emailId: string,
  keyword: string,
  value: boolean,
  headers?: Record<string, string>,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL],
      methodCalls: [
        [
          'Email/set',
          {
            accountId,
            update: {
              [emailId]: {
                [`keywords/${keyword}`]: value ? true : null,
              },
            },
          },
          '0',
        ],
      ],
    },
    headers,
  );

  if (!json || !json.methodResponses) {
    return { success: false, message: 'not a valid JMAP response' };
  }

  const m = (json.methodResponses as unknown[])[0] as [
    string,
    { updated?: Record<string, unknown>; notUpdated?: Record<string, unknown> },
  ];

  if (!m || m[0] !== 'Email/set') {
    return { success: false, message: 'not the expected method' };
  }
  if (m[1]?.notUpdated && m[1].notUpdated[emailId]) {
    return { success: false, message: 'the server rejected the update' };
  }

  return { success: true, data: true };
};

export const getBasicToken = (username: string, password: string): string => {
  return Base64.encode(`${username}:${password}`);
};
