import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.afterEach(async ({ page }) => {
  await page.request.delete('/api/me');
});

test('Ohne Anmeldung führt jede App-Seite zum Login', async ({ page }) => {
  await page.goto('/entdecken');
  await expect(page).toHaveURL(/\/anmelden$/);
  expect((await page.request.post('/api/agents/kim', { headers: { origin: 'http://localhost:3000' }, data: { messages: [{ role: 'user', content: 'Hallo' }] } })).status()).toBe(401);
});

test('Neues Konto: Anmelden, Onboarding, Tutorial, dann Heute', async ({ page }) => {
  const email = `neu-${crypto.randomUUID()}@example.org`;
  await page.goto('/anmelden');
  await page.getByLabel('E-Mail').fill(email);
  await page.getByRole('button', { name: 'Link senden' }).click();
  await page.getByTestId('demo-login').click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByPlaceholder('Dein Name').fill('Mira');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Flingern' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Wohnen' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText(/Gmail-Konto verbindest du später/)).toBeVisible();
  await expect(page.getByLabel(/Empfänger/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Fertig' }).click();

  await expect(page).toHaveURL(/\/tutorial$/);
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await expect(page).toHaveURL(/\/entdecken$/);

  // The account now lives on the server: a fresh load skips onboarding and tutorial.
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await expect(page).toHaveURL(/\/entdecken$/);
  await page.goto('/ich');
  await expect(page.getByRole('heading', { name: 'Mira' })).toBeVisible();
  await expect(page.getByLabel('Dein Ort und Stadtteil')).toHaveValue('Düsseldorf-Flingern');
  await expect(page.getByRole('button', { name: 'Wohnen' })).toHaveCount(0);
});

test('Zwei Konten auf einem Gerät sehen nur ihre eigenen Daten', async ({ page }) => {
  const first = await signIn(page);
  await page.goto('/ich');
  await expect(page.getByTestId('account-email')).toHaveText(first);
  await page.getByRole('button', { name: 'Ruhe' }).click();
  await expect(page.getByRole('button', { name: 'Ruhe' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Abmelden oder Konto wechseln' }).click();
  await expect(page).toHaveURL(/\/anmelden$/);
  await expect(page.getByRole('button', { name: first })).toBeVisible();

  const second = await signIn(page);
  await page.goto('/ich');
  await expect(page.getByTestId('account-email')).toHaveText(second);
  await expect(page.getByRole('button', { name: 'Ruhe' })).toHaveAttribute('aria-pressed', 'false');
  await page.request.delete('/api/me');

  await signIn(page, first);
  await page.goto('/ich');
  await expect(page.getByRole('button', { name: 'Ruhe' })).toHaveAttribute('aria-pressed', 'true');
});

test('Tour: zeigt jeden Tab im Überblick und lässt sich wiederholen', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto('/tutorial');
  await page.getByRole('button', { name: 'Tour starten' }).click();

  const dialog = page.getByRole('dialog', { name: /^Tutorial:/ });
  const seen = new Set<string>();
  const paths = new Set<string>();
  let last = 0;
  for (let i = 0; i < 30; i++) {
    // Wait for the next bubble (its counter moves on); the dev server may first compile the page.
    const counter = dialog.getByText(/^\d+ \/ \d+$/);
    await expect(async () => {
      const [n] = (await counter.innerText()).split(' / ').map(Number);
      expect(n).toBeGreaterThan(last);
    }).toPass({ timeout: 25_000 });
    await expect(dialog.getByRole('heading')).not.toHaveText('Einen Moment …', { timeout: 10_000 });
    const [n, total] = (await counter.innerText()).split(' / ').map(Number);
    last = n;
    seen.add((await dialog.getAttribute('aria-label'))!.replace('Tutorial: ', ''));
    paths.add(new URL(page.url()).pathname);
    await dialog.getByRole('button', { name: n === total ? 'Fertig' : 'Weiter' }).click();
    if (n === total) break;
  }
  await expect(dialog).toHaveCount(0);
  for (const h of ['Heute', 'Mitmachen', 'Kim', 'Ich']) expect(seen).toContain(h);
  for (const p of ['/entdecken', '/frag-nach', '/ich']) expect(paths).toContain(p);
  // The example in the tour is never saved or sent.
  expect((await (await page.request.get('/api/drafts')).json()).drafts).toHaveLength(0);
  expect((await (await page.request.get('/api/submissions')).json()).submissions).toHaveLength(0);

  await page.goto('/ich');
  await page.getByRole('link', { name: 'Tutorial wiederholen' }).click();
  await page.getByRole('button', { name: 'Tour starten' }).click();
  await expect(dialog).toContainText('Ein kurzer Rundgang');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('Datenexport enthält das eigene Konto, Datenschutz ist ohne Anmeldung lesbar', async ({ page }) => {
  const email = await signIn(page);
  const res = await page.request.get('/api/me/export');
  expect(res.headers()['content-disposition']).toContain('openmind-meine-daten.json');
  const data = await res.json();
  expect(data.konto.email).toBe(email);
  expect(Object.keys(data)).toEqual(expect.arrayContaining(['profil', 'einstellungen', 'entwuerfe', 'gesendet', 'gemerkt', 'recherchen', 'gmail']));
  expect(JSON.stringify(data)).not.toContain('refreshToken');

  await page.request.post('/api/auth/logout');
  await page.context().clearCookies();
  await page.goto('/datenschutz');
  await expect(page.getByRole('heading', { name: 'Datenschutz' })).toBeVisible();
  expect((await page.request.get('/api/me/export')).status()).toBe(401);
});
