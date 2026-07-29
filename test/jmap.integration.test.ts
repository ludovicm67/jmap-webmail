import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Base64 } from 'js-base64';
import {
  destroyEmails,
  fetchIdentities,
  fetchMail,
  fetchMailboxes,
  fetchMails,
  fetchSession,
  getMailAccountId,
  moveEmails,
  setEmailKeyword,
  setEmailsKeyword,
} from '../src/lib/jmap';

// Exercises the JMAP client in src/lib/jmap.ts against the local Stalwart
// server from compose.yaml. Run with:
//   docker compose up -d
//   npm run test:integration
const SESSION_URL =
  process.env.STALWART_URL ?? 'http://localhost:8080/.well-known/jmap';
// The account provisioned by dev/stalwart-setup.mjs.
const AUTH =
  process.env.STALWART_AUTH ??
  `Basic ${Base64.encode('test@example.org:jmap-webmail-test-passphrase-2026')}`;
const headers = { Authorization: AUTH };

// Skip unless explicitly enabled (the server has to be running).
const enabled = Boolean(
  process.env.STALWART_URL || process.env.RUN_INTEGRATION,
);
const suite = enabled ? describe : describe.skip;

// Stalwart advertises its URLs with the internal container hostname over TLS,
// which isn't reachable from the host. Rebase the path onto the local origin.
const localize = (advertised: string): string => {
  const origin = new URL(SESSION_URL).origin;
  const target = new URL(advertised);
  return origin + target.pathname + target.search;
};

suite('JMAP client against a live Stalwart server', () => {
  let apiUrl: string;
  let accountId: string;
  let inboxId: string;
  let injectedId: string;

  // Inject a message straight into a mailbox (Email/set create) so the read /
  // keyword / move paths have real data to operate on.
  const injectEmail = async (subject: string): Promise<string> => {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
        methodCalls: [
          [
            'Email/set',
            {
              accountId,
              create: {
                e: {
                  mailboxIds: { [inboxId]: true },
                  keywords: {},
                  from: [{ name: 'Test Sender', email: 'sender@example.com' }],
                  to: [{ email: 'admin@localhost' }],
                  subject,
                  bodyValues: {
                    b: { value: 'Integration test body line 1\nline 2' },
                  },
                  textBody: [{ partId: 'b', type: 'text/plain' }],
                },
              },
            },
            '0',
          ],
        ],
      }),
    });
    const json = await response.json();
    return json.methodResponses[0][1].created.e.id;
  };

  beforeAll(async () => {
    const session = await fetchSession(SESSION_URL, headers);
    expect(session.success, 'fetchSession should succeed').toBe(true);
    if (!session.success) return;

    expect(session.data.apiUrl, 'session should advertise an apiUrl').toMatch(
      /\/jmap\/?$/,
    );
    apiUrl = localize(session.data.apiUrl);
    accountId = getMailAccountId(session.data) ?? '';
    expect(accountId, 'a mail accountId should be resolved').toBeTruthy();

    const mailboxes = await fetchMailboxes(apiUrl, accountId, headers);
    expect(mailboxes.success).toBe(true);
    if (!mailboxes.success) return;
    inboxId = mailboxes.data.find((m) => m.role === 'inbox')?.id ?? '';
    expect(inboxId, 'an inbox mailbox should exist').toBeTruthy();

    injectedId = await injectEmail('Integration test message');
  });

  afterAll(async () => {
    if (apiUrl && accountId && injectedId) {
      await destroyEmails(apiUrl, accountId, [injectedId], headers);
    }
  });

  it('fetchSession resolves an absolute apiUrl and accountId', () => {
    expect(apiUrl).toMatch(/^https?:\/\//);
    expect(accountId).toBeTruthy();
  });

  it('fetchMailboxes returns the standard role mailboxes', async () => {
    const res = await fetchMailboxes(apiUrl, accountId, headers);
    expect(res.success).toBe(true);
    if (!res.success) return;
    const roles = res.data.map((m) => m.role);
    expect(roles).toContain('inbox');
    expect(roles).toContain('trash');
  });

  it('fetchMails lists the injected message', async () => {
    const res = await fetchMails(apiUrl, accountId, headers);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.some((m) => m.id === injectedId)).toBe(true);
  });

  it('fetchMail returns headers and the text body', async () => {
    const res = await fetchMail(apiUrl, accountId, injectedId, headers);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.subject).toContain('Integration test');
    const part = res.data.textBody?.[0];
    const body = part?.partId
      ? res.data.bodyValues?.[part.partId]?.value
      : undefined;
    expect(body).toContain('Integration test body');
  });

  it('marks a message read then unread via keywords', async () => {
    const seen = await setEmailKeyword(
      apiUrl,
      accountId,
      injectedId,
      '$seen',
      true,
      headers,
    );
    expect(seen.success).toBe(true);
    let mail = await fetchMail(apiUrl, accountId, injectedId, headers);
    expect(mail.success && mail.data.keywords.$seen).toBe(true);

    const unseen = await setEmailsKeyword(
      apiUrl,
      accountId,
      [injectedId],
      '$seen',
      false,
      headers,
    );
    expect(unseen.success).toBe(true);
    mail = await fetchMail(apiUrl, accountId, injectedId, headers);
    expect(mail.success && mail.data.keywords.$seen === true).toBe(false);
  });

  it('moves a message to another mailbox', async () => {
    const mailboxes = await fetchMailboxes(apiUrl, accountId, headers);
    if (!mailboxes.success) throw new Error('could not list mailboxes');
    const trashId = mailboxes.data.find((m) => m.role === 'trash')?.id ?? '';
    expect(trashId).toBeTruthy();

    const moveId = await injectEmail('Message to be moved');
    const moved = await moveEmails(
      apiUrl,
      accountId,
      [moveId],
      trashId,
      headers,
    );
    expect(moved.success).toBe(true);

    const mail = await fetchMail(apiUrl, accountId, moveId, headers);
    expect(mail.success && mail.data.mailboxIds[trashId]).toBe(true);

    await destroyEmails(apiUrl, accountId, [moveId], headers);
  });

  it('fetchIdentities succeeds (list may be empty for the admin account)', async () => {
    const res = await fetchIdentities(apiUrl, accountId, headers);
    expect(res.success).toBe(true);
  });
});
