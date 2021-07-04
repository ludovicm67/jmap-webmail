import { Base64 } from 'js-base64';

export const discoverJmapEndpoint = async (domain: string): Promise<string> => {
  const wellKnownURL = `https://${domain}/.well-known/jmap`;
  const response = await fetch(wellKnownURL);
  return response.url;
};

export const fetchMailboxes = async (
  endpoint: string,
  accountId: string,
  headers?: Record<string, string>,
): Promise<Record<string, string | number | boolean>> => {
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

  const list = mbx[1].list;
  return list;
};

export const tryCredentials = async (
  endpoint: string,
  headers?: Record<string, string>,
): Promise<undefined> => {
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
