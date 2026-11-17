import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => { await signIn(page); });
test.afterEach(async ({ page }) => { await page.request.delete('/api/me'); });

test('Heute zeigt echte Nachrichten mit Quellen-Siegel und Link zum Original', async ({ page }) => {
  await page.goto('/entdecken');
  const first = page.getByTestId('news-card').first();
  await expect(first).toBeVisible({ timeout: 60_000 });
  await expect(first.locator('.seal')).toBeVisible();
  await first.locator('button').first().click();
  const original = page.getByRole('link', { name: 'Original lesen' });
  await expect(original).toHaveAttribute('href', /^https:\/\/(www1?\.)?(duesseldorf|bundesregierung|bundestag|tagesschau|wdr|ec\.europa)/);
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/saved'));
  await page.getByRole('dialog').getByRole('button', { name: 'Merken' }).click();
  const res = await saved;
  expect(res.status(), await res.text()).toBe(200);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('group', { name: 'Filter' }).getByRole('button', { name: 'Gemerkt' }).click();
  await expect(page.getByTestId('news-card')).toHaveCount(1);
});

test('Interessen ändern die Reihenfolge der News', async ({ page }) => {
  const order = async (interests: string[]) => {
    await page.request.patch('/api/me', { data: { profile: { interests, district: 'Düsseldorf-Bilk' } } });
    const { items } = await (await page.request.get('/api/news')).json();
    return items.slice(0, 10).map((i: { id: string }) => i.id).join();
  };
  expect(await order(['Verkehr'])).not.toEqual(await order(['Gesundheit']));
});

test('Mitmachen zeigt echte Angebote, die auf offizielle Seiten führen', async ({ page }) => {
  await page.goto('/mitmachen');
  await expect(page.getByTestId('opportunity-card').first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Ehrenamt' }).click();
  const links = page.getByTestId('opportunity-card').getByRole('link', { name: 'Öffnen' });
  for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) expect(href).toMatch(/^https:\/\/www\.duesseldorf\.de\//);
  await page.getByRole('button', { name: 'Stadt & Rat' }).click();
  await expect(page.getByRole('link', { name: 'Mit Kim schreiben' })).toHaveAttribute('href', '/mitmachen/antrag');
});
