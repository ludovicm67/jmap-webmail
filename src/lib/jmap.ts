import { Base64 } from 'js-base64';
import { Identity, Mail, Mailbox } from '../features/mail/types';
import { randomString } from './random';

export const JMAP_CORE = 'urn:ietf:params:jmap:core';
export const JMAP_MAIL = 'urn:ietf:params:jmap:mail';
export const JMAP_SUBMISSION = 'urn:ietf:params:jmap:submission';

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
  try {
    const response = await fetch(wellKnownURL);
    return response.url;
  } catch {
    // Network / CORS failure — let the caller fall back to manual entry.
    return '';
  }
};

export type AuthMethods = {
  basic: boolean;
  bearer: boolean;
  // Whether the `WWW-Authenticate` header was actually readable. Cross-origin
  // servers may not expose it (CORS), in which case detection is inconclusive.
  detected: boolean;
};

/**
 * Probe the session endpoint without credentials and read the
 * `WWW-Authenticate` challenge to learn which auth schemes it accepts
 * (e.g. `Basic`, `Bearer`). If the header isn't exposed, `detected` is false
 * and the caller should let the user pick the method manually.
 */
export const probeAuthMethods = async (
  sessionUrl: string,
): Promise<AuthMethods> => {
  try {
    const response = await fetch(sessionUrl, { method: 'GET' });
    const header = response.headers.get('WWW-Authenticate') || '';
    if (!header) {
      return { basic: false, bearer: false, detected: false };
    }
    const lower = header.toLowerCase();
    return {
      basic: lower.includes('basic'),
      bearer: lower.includes('bearer'),
      detected: true,
    };
  } catch {
    return { basic: false, bearer: false, detected: false };
  }
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
              'replyTo',
              'sender',
              'subject',
              'receivedAt',
              'size',
              'preview',
              'messageId',
              'inReplyTo',
              'references',
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

// Validate an `Email/set` response and surface any per-id rejection.
const parseEmailSetResponse = (
  json: Record<string, unknown> | undefined,
  ids: string[],
): JMAPResponse<true> => {
  if (!json || !json.methodResponses) {
    return { success: false, message: 'not a valid JMAP response' };
  }
  const m = (json.methodResponses as unknown[])[0] as [
    string,
    {
      notUpdated?: Record<string, { description?: string }>;
      notDestroyed?: Record<string, { description?: string }>;
    },
  ];
  if (!m || m[0] !== 'Email/set') {
    return { success: false, message: 'not the expected method' };
  }
  const rejected = {
    ...(m[1]?.notUpdated || {}),
    ...(m[1]?.notDestroyed || {}),
  };
  for (const id of ids) {
    if (rejected[id]) {
      return {
        success: false,
        message: rejected[id]?.description || 'the server rejected the change',
      };
    }
  }
  return { success: true, data: true };
};

/**
 * Set (or clear) a keyword on one or more emails, e.g. `$seen` for read/unread.
 * See https://www.rfc-editor.org/rfc/rfc8621#section-4.6
 */
export const setEmailsKeyword = async (
  apiUrl: string,
  accountId: string,
  ids: string[],
  keyword: string,
  value: boolean,
  headers?: Record<string, string>,
): Promise<JMAPResponse<true>> => {
  const patch = { [`keywords/${keyword}`]: value ? true : null };
  const update: Record<string, unknown> = {};
  for (const id of ids) {
    update[id] = patch;
  }
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL],
      methodCalls: [['Email/set', { accountId, update }, '0']],
    },
    headers,
  );
  return parseEmailSetResponse(json, ids);
};

/** Single-email convenience wrapper around {@link setEmailsKeyword}. */
export const setEmailKeyword = (
  apiUrl: string,
  accountId: string,
  emailId: string,
  keyword: string,
  value: boolean,
  headers?: Record<string, string>,
): Promise<JMAPResponse<true>> =>
  setEmailsKeyword(apiUrl, accountId, [emailId], keyword, value, headers);

/** Move emails into a single mailbox (replacing their mailbox membership). */
export const moveEmails = async (
  apiUrl: string,
  accountId: string,
  ids: string[],
  targetMailboxId: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<true>> => {
  const update: Record<string, unknown> = {};
  for (const id of ids) {
    update[id] = { mailboxIds: { [targetMailboxId]: true } };
  }
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL],
      methodCalls: [['Email/set', { accountId, update }, '0']],
    },
    headers,
  );
  return parseEmailSetResponse(json, ids);
};

/** Permanently destroy emails. */
export const destroyEmails = async (
  apiUrl: string,
  accountId: string,
  ids: string[],
  headers?: Record<string, string>,
): Promise<JMAPResponse<true>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL],
      methodCalls: [['Email/set', { accountId, destroy: ids }, '0']],
    },
    headers,
  );
  return parseEmailSetResponse(json, ids);
};

/** Fetch the sending identities (the addresses the user can send "from"). */
export const fetchIdentities = async (
  apiUrl: string,
  accountId: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<Identity[]>> => {
  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_SUBMISSION],
      methodCalls: [['Identity/get', { accountId, ids: null }, '0']],
    },
    headers,
  );

  if (!json || !json.methodResponses) {
    return { success: false, message: 'not a valid JMAP response' };
  }
  const m = (json.methodResponses as unknown[])[0] as [
    string,
    { list?: Identity[] },
  ];
  if (!m || (m[0] !== 'Identity/get' && m[0] !== 'error')) {
    return { success: false, message: 'not the expected method' };
  }
  if (m[0] === 'error' || !m[1] || !Array.isArray(m[1].list)) {
    return { success: false, message: 'could not fetch identities' };
  }
  return { success: true, data: m[1].list };
};

// A JMAP messageId value is the Message-ID without the surrounding angle
// brackets (RFC 8621 §4.1.1 header:Message-ID:asMessageIds).
const generateMessageId = (fromEmail: string): string => {
  const domain = fromEmail.split('@')[1] || 'localhost';
  return `${Date.now()}.${randomString(24)}@${domain}`;
};

export type SendEmailParams = {
  identityId: string;
  from: { name?: string | null; email: string };
  to: { name?: string | null; email: string }[];
  subject: string;
  textBody: string;
  draftsMailboxId: string;
  sentMailboxId?: string;
  inReplyTo?: string[];
  references?: string[];
};

/**
 * Create a draft and submit it in a single request, then move it to Sent.
 * The canonical JMAP send flow: Email/set create + EmailSubmission/set create
 * with onSuccessUpdateEmail. Requires the submission capability + an identity.
 * See https://www.rfc-editor.org/rfc/rfc8621#section-7
 */
export const sendEmail = async (
  apiUrl: string,
  accountId: string,
  params: SendEmailParams,
  headers?: Record<string, string>,
): Promise<JMAPResponse<true>> => {
  const {
    identityId,
    from,
    to,
    subject,
    textBody,
    draftsMailboxId,
    sentMailboxId,
    inReplyTo,
    references,
  } = params;

  const draft: Record<string, unknown> = {
    mailboxIds: { [draftsMailboxId]: true },
    keywords: { $draft: true, $seen: true },
    from: [from],
    to,
    subject,
    messageId: [generateMessageId(from.email)],
    bodyValues: { body: { value: textBody } },
    textBody: [{ partId: 'body', type: 'text/plain' }],
  };
  if (inReplyTo && inReplyTo.length > 0) {
    draft.inReplyTo = inReplyTo;
  }
  if (references && references.length > 0) {
    draft.references = references;
  }

  const onSuccessUpdateEmail: Record<string, unknown> = {
    'keywords/$draft': null,
  };
  if (sentMailboxId) {
    onSuccessUpdateEmail[`mailboxIds/${sentMailboxId}`] = true;
    onSuccessUpdateEmail[`mailboxIds/${draftsMailboxId}`] = null;
  }

  const json = await postJmap(
    apiUrl,
    {
      using: [JMAP_CORE, JMAP_MAIL, JMAP_SUBMISSION],
      methodCalls: [
        ['Email/set', { accountId, create: { draft } }, '0'],
        [
          'EmailSubmission/set',
          {
            accountId,
            create: { sub: { emailId: '#draft', identityId } },
            onSuccessUpdateEmail: { '#sub': onSuccessUpdateEmail },
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
  const responses = json.methodResponses as unknown[];

  const emailSet = responses[0] as [
    string,
    { notCreated?: Record<string, { description?: string }> },
  ];
  if (!emailSet || emailSet[0] !== 'Email/set') {
    return { success: false, message: 'could not create the draft' };
  }
  if (emailSet[1]?.notCreated?.draft) {
    return {
      success: false,
      message:
        emailSet[1].notCreated.draft.description ||
        'could not create the draft',
    };
  }

  const subSet = responses[1] as [
    string,
    { notCreated?: Record<string, { description?: string }> },
  ];
  if (!subSet || subSet[0] === 'error') {
    return {
      success: false,
      message: 'the server does not support sending mail (submission).',
    };
  }
  if (subSet[0] !== 'EmailSubmission/set') {
    return { success: false, message: 'the message could not be sent' };
  }
  if (subSet[1]?.notCreated?.sub) {
    return {
      success: false,
      message:
        subSet[1].notCreated.sub.description || 'the message could not be sent',
    };
  }

  return { success: true, data: true };
};

export const getBasicToken = (username: string, password: string): string => {
  return Base64.encode(`${username}:${password}`);
};
