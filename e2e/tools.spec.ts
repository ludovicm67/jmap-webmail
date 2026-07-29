import { test, expect } from '@playwright/test';
import { attachDiagnostics, signIn, stalwartReachable } from './helpers';

test.beforeEach(async () => {
  test.skip(
    !(await stalwartReachable()),
    'Local Stalwart is not running (docker compose up -d && node dev/stalwart-setup.mjs)',
  );
});

test('left rail exposes the capability tools', async ({ page }) => {
  attachDiagnostics(page);
  await signIn(page);

  const nav = page.locator('nav').first();
  for (const label of [
    'Mail',
    'Contacts',
    'Calendar',
    'Files',
    'Filters',
    'Settings',
  ]) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible();
  }
});

test('files: shows seeded storage and creates a folder', async ({ page }) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('link', { name: 'Files' }).click();
  await expect(page.getByText('Documents').first()).toBeVisible();

  const name = `Folder ${Date.now()}`;
  await page.getByRole('button', { name: 'New folder' }).click();
  await page.locator('#folder-name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText(name).first()).toBeVisible();
});

test('filters: creates and saves a Sieve script', async ({ page }) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('link', { name: 'Filters' }).click();
  // Start a new filter (the "+" in the sidebar header).
  await page.locator('aside').getByRole('button').first().click();

  const name = `filter-${Date.now()}`;
  await page.locator('#filter-name').fill(name);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await expect(page.locator('aside').getByText(name)).toBeVisible();
});

test('settings: renders vacation, storage and notifications', async ({
  page,
}) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByText('Vacation responder')).toBeVisible();
  await expect(page.getByText('Storage', { exact: true })).toBeVisible();
  await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enable notifications' }),
  ).toBeVisible();
});

test('calendar: switches between month, week and year views', async ({
  page,
}) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('link', { name: 'Calendar' }).click();
  // Sidebar calendar list is present.
  await expect(page.getByText('My calendars')).toBeVisible();

  await page.getByRole('button', { name: 'week' }).click();
  await expect(page.getByText('09:00').first()).toBeVisible();

  await page.getByRole('button', { name: 'year' }).click();
  await expect(page.getByText('January').first()).toBeVisible();
});

test('compose: attaches a file and offers contacts', async ({ page }) => {
  attachDiagnostics(page);
  await signIn(page);

  await page.getByRole('button', { name: 'Compose' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Attach a small file and confirm the chip shows.
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'hello.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello attachment'),
  });
  await expect(dialog.getByText('hello.txt')).toBeVisible();

  // The contacts picker lists a seeded contact.
  await dialog.getByRole('button', { name: 'Contacts' }).click();
  await expect(dialog.getByText('Alice Example').first()).toBeVisible();
});
