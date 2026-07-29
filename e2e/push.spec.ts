import { test, expect } from '@playwright/test';
import {
  attachDiagnostics,
  deliverToInbox,
  inboxUnreadCount,
  signIn,
  stalwartReachable,
} from './helpers';

test.beforeEach(async () => {
  test.skip(
    !(await stalwartReachable()),
    'Local Stalwart is not running (docker compose up -d && node dev/stalwart-setup.mjs)',
  );
});

test('signs in and shows the mailbox list', async ({ page }) => {
  attachDiagnostics(page);
  await signIn(page);
  await expect(page.getByText('Inbox').first()).toBeVisible();
  await expect(page.getByText('Welcome to Stalwart').first()).toBeVisible();
});

test('a newly delivered email appears in the list automatically (push)', async ({
  page,
}) => {
  attachDiagnostics(page);
  await signIn(page);
  // Give the WebSocket a moment to connect and enable push.
  await page.waitForTimeout(1500);

  const subject = `E2E push ${Date.now()}`;
  await deliverToInbox(subject);

  // No manual refresh: the message must appear via the push-driven refetch.
  await expect(page.getByText(subject).first()).toBeVisible({
    timeout: 20_000,
  });
});

test('the Inbox unread count increases when a new mail arrives (push)', async ({
  page,
}) => {
  attachDiagnostics(page);
  await signIn(page);
  await page.waitForTimeout(1500);

  const before = await inboxUnreadCount(page);
  await deliverToInbox(`Unread ${Date.now()}`);

  await expect
    .poll(() => inboxUnreadCount(page), { timeout: 20_000 })
    .toBeGreaterThan(before);
});

test('the list still updates while an email is open (push)', async ({
  page,
}) => {
  attachDiagnostics(page);
  await signIn(page);

  // Open a message so the reading pane is showing.
  await page.getByText('Welcome to Stalwart').first().click();
  await expect(page.getByText('From:').first()).toBeVisible();
  await page.waitForTimeout(1000);

  const subject = `While reading ${Date.now()}`;
  await deliverToInbox(subject);

  await expect(page.getByText(subject).first()).toBeVisible({
    timeout: 20_000,
  });
});
