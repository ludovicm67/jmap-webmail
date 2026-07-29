import { test, expect } from '@playwright/test';
import { attachDiagnostics, signIn, stalwartReachable } from './helpers';

test.beforeEach(async () => {
  test.skip(
    !(await stalwartReachable()),
    'Local Stalwart is not running (docker compose up -d && node dev/stalwart-setup.mjs)',
  );
});

test('contacts: lists seeded contacts and can create one', async ({ page }) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('link', { name: 'Contacts' }).click();
  await expect(page.getByText('Alice Example').first()).toBeVisible();

  const name = `Charlie ${Date.now()}`;
  await page.getByRole('button', { name: 'New' }).click();
  await page.locator('#contact-name').fill(name);
  await page.locator('#contact-emails').fill('charlie@example.org');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(name).first()).toBeVisible();
});

test('calendar: renders the month grid with controls', async ({ page }) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('link', { name: 'Calendar' }).click();
  await expect(page.getByText('Mon').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New event' })).toBeVisible();
});

test('compose offers the account identities (switchable)', async ({ page }) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('button', { name: 'Compose' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The "From" identity select should list the two seeded identities.
  await dialog.getByRole('combobox').first().click();
  await expect(page.getByRole('option')).toHaveCount(2);
});

test('account switcher shows the shared mailbox and switches to it', async ({
  page,
}) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('button', { name: /test@example\.org/ }).click();
  const bob = page.getByRole('menuitemradio', { name: /bob@example\.org/ });
  await expect(bob).toBeVisible();
  await bob.click();

  // The shared mailbox (Bob's) message is now shown.
  await expect(page.getByText('Bob mailbox sample').first()).toBeVisible({
    timeout: 15_000,
  });
});
