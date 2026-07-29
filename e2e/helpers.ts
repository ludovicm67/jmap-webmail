import { Page, expect } from '@playwright/test';

export const STALWART = process.env.STALWART_BASE ?? 'http://localhost:8080';
export const ENDPOINT =
  process.env.E2E_ENDPOINT ?? 'http://localhost:3000/.well-known/jmap';
export const TEST_EMAIL = 'test@example.org';
export const TEST_PASS = 'jmap-webmail-test-passphrase-2026';
const AUTH =
  'Basic ' + Buffer.from(`${TEST_EMAIL}:${TEST_PASS}`).toString('base64');

export const stalwartReachable = async (): Promise<boolean> => {
  try {
    return (await fetch(`${STALWART}/healthz/live`)).ok;
  } catch {
    return false;
  }
};

const jmap = async (calls: unknown[]) => {
  const res = await fetch(`${STALWART}/jmap`, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls: calls,
    }),
  });
  return res.json();
};

// Deliver a message straight into test@example.org's inbox (simulating a new
// arrival), returning nothing — the test asserts the UI reacts to the push.
export const deliverToInbox = async (subject: string): Promise<void> => {
  const session = await (
    await fetch(`${STALWART}/.well-known/jmap`, {
      headers: { Authorization: AUTH },
    })
  ).json();
  const accountId = session.primaryAccounts['urn:ietf:params:jmap:mail'];
  const mbx = await jmap([
    ['Mailbox/get', { accountId, ids: null, properties: ['id', 'role'] }, '0'],
  ]);
  const inbox = mbx.methodResponses[0][1].list.find(
    (m: { role: string }) => m.role === 'inbox',
  ).id;
  await jmap([
    [
      'Email/set',
      {
        accountId,
        create: {
          e: {
            mailboxIds: { [inbox]: true },
            keywords: {},
            from: [{ name: 'E2E Sender', email: 'e2e@example.com' }],
            to: [{ email: TEST_EMAIL }],
            subject,
            bodyValues: { b: { value: 'e2e push body' } },
            textBody: [{ partId: 'b', type: 'text/plain' }],
          },
        },
      },
      '0',
    ],
  ]);
};

// Attach console / websocket / network logging so failures are diagnosable.
export const attachDiagnostics = (page: Page): void => {
  page.on('console', (m) => console.log(`[page:${m.type()}]`, m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('requestfailed', (r) =>
    console.log('[reqfailed]', r.method(), r.url(), r.failure()?.errorText),
  );
  page.on('request', (r) => {
    if (r.url().includes('/jmap') && r.method() === 'POST') {
      console.log('[POST]', r.url());
    }
  });
  page.on('websocket', (ws) => {
    console.log('[ws open]', ws.url());
    ws.on('framesent', (f) =>
      console.log('[ws >>]', String(f.payload).slice(0, 200)),
    );
    ws.on('framereceived', (f) =>
      console.log('[ws <<]', String(f.payload).slice(0, 200)),
    );
    ws.on('close', () => console.log('[ws close]'));
    ws.on('socketerror', (e) => console.log('[ws error]', e));
  });
};

// The unread count shown on the Inbox row in the mailboxes pane (0 if none).
export const inboxUnreadCount = async (page: Page): Promise<number> => {
  const link = page
    .locator('aside')
    .getByRole('link')
    .filter({ hasText: 'Inbox' })
    .first();
  const text = (await link.textContent()) ?? '';
  const match = text.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
};

// Sign in via "More options" with a manual endpoint (local Stalwart).
export const signIn = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.locator('#login-form-identifier').fill(TEST_EMAIL);
  await page.getByRole('checkbox').click(); // "More options"
  await page.locator('#login-form-endpoint').fill(ENDPOINT);
  await page.locator('#login-form-password').fill(TEST_PASS);
  await page.getByRole('button', { name: 'Sign In' }).click();
  // The seeded welcome message confirms the mail view + list have loaded.
  await expect(page.getByText('Welcome to Stalwart').first()).toBeVisible();
};
