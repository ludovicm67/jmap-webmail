import { Base64 } from 'js-base64';
import { Mail, Mailbox } from '../features/mail/types';

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

export const fetchMailboxes = async (
  endpoint: string,
  accountId: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<Mailbox[]>> => {
  const response = await fetch(endpoint, {
    headers: new Headers({ ...headers, 'Content-Type': 'application/json' }),
    method: 'POST',
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: [
        [
          'Mailbox/get',
          {
            accountId: accountId,
            ids: null,
          },
          '0',
        ],
      ],
    }),
  });
  const json = await response.json();
  if (!json.methodResponses) {
    return {
      success: false,
      message: 'not a valid JMAP response',
    };
  }

  const methodResponses = json.methodResponses;
  if (
    !methodResponses ||
    !Array.isArray(methodResponses) ||
    methodResponses.length !== 1
  ) {
    return {
      success: false,
      message: 'no valid response',
    };
  }

  const mbx = methodResponses[0];

  if (mbx[0] !== 'Mailbox/get') {
    return {
      success: false,
      message: 'not the expected method',
    };
  }
  if (!mbx[1] || !mbx[1].list || !Array.isArray(mbx[1].list)) {
    return {
      success: false,
      message: 'could not fetch mailboxes',
    };
  }

  const list = mbx[1].list as Mailbox[];

  return {
    success: true,
    data: list,
  };
};

export const fetchMails = async (
  endpoint: string,
  accountId: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<Mail[]>> => {
  const response = await fetch(endpoint, {
    headers: new Headers({ ...headers, 'Content-Type': 'application/json' }),
    method: 'POST',
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: [
        [
          'Email/query',
          {
            accountId,
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
              'subject',
              'receivedAt',
              'size',
              'preview',
            ],
          },
          '1',
        ],
      ],
    }),
  });
  const json = await response.json();
  if (!json.methodResponses) {
    return {
      success: false,
      message: 'not a valid JMAP response',
    };
  }

  const methodResponses = json.methodResponses;
  if (
    !methodResponses ||
    !Array.isArray(methodResponses) ||
    methodResponses.length !== 2
  ) {
    return {
      success: false,
      message: 'no valid response',
    };
  }

  const m = methodResponses[1];

  if (m[0] !== 'Email/get') {
    return {
      success: false,
      message: 'not the expected method',
    };
  }
  if (!m[1] || !m[1].list || !Array.isArray(m[1].list)) {
    return {
      success: false,
      message: 'could not fetch emails',
    };
  }

  const list = m[1].list as Mail[];

  return {
    success: true,
    data: list,
  };
};

export const fetchMail = async (
  endpoint: string,
  accountId: string,
  emailId: string,
  headers?: Record<string, string>,
): Promise<JMAPResponse<Mail>> => {
  const response = await fetch(endpoint, {
    headers: new Headers({ ...headers, 'Content-Type': 'application/json' }),
    method: 'POST',
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
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
              'subject',
              'receivedAt',
              'size',
              'preview',
              'htmlBody',
            ],
          },
          '0',
        ],
      ],
    }),
  });
  const json = await response.json();
  if (!json.methodResponses) {
    return {
      success: false,
      message: 'not a valid JMAP response',
    };
  }

  const methodResponses = json.methodResponses;
  if (
    !methodResponses ||
    !Array.isArray(methodResponses) ||
    methodResponses.length !== 1
  ) {
    return {
      success: false,
      message: 'no valid response',
    };
  }

  const m = methodResponses[0];

  if (m[0] !== 'Email/get') {
    return {
      success: false,
      message: 'not the expected method',
    };
  }
  if (
    !m[1] ||
    !m[1].list ||
    !Array.isArray(m[1].list) ||
    m[1].list.length !== 1
  ) {
    return {
      success: false,
      message: 'could not fetch email',
    };
  }

  const mail = m[1].list[0] as Mail;

  return {
    success: true,
    data: mail,
  };
};

export const tryCredentials = async (
  endpoint: string,
  headers?: Record<string, string>,
): Promise<Record<string, string>> => {
  const response = await fetch(endpoint, {
    headers: new Headers({ ...headers, 'Content-Type': 'application/json' }),
    method: 'GET',
  });
  const json = await response.json();
  return json;
};

export const getBasicToken = (username: string, password: string): string => {
  return Base64.encode(`${username}:${password}`);
};
