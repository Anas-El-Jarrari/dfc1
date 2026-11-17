import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test.afterEach(async ({ page }) => {
  await page.request.delete('/api/me');
});

test('Erst du: Einordnen, Nachfragen und Handeln bleiben bis zur eigenen Tendenz gesperrt', async ({ page }) => {
  await page.goto('/thema/radwege-bilk');
  for (const n of [3, 4, 5]) await expect(page.getByTestId(`locked-${n}`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Stellungnahme schreiben' })).toHaveCount(0);

  await expect(page.getByRole('button', { name: 'Tendenz festhalten' })).toBeDisabled();
  await page.getByRole('radio', { name: 'eher dafür' }).click();
  await page.getByRole('button', { name: 'Tendenz festhalten' }).click();

  for (const n of [3, 4, 5]) await expect(page.getByTestId(`locked-${n}`)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Stellungnahme schreiben' })).toBeVisible();
});

test('Wisch-Slider: per Tastatur bedienbar und gesperrt, solange keine Wahl getroffen ist', async ({ page }) => {
  await page.goto('/stimme');
  const slider = page.getByTestId('swipe-slider');
  await expect(slider).toHaveAttribute('aria-disabled', 'true');

  await page.getByRole('radio', { name: 'unentschieden' }).click();
  await slider.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Deine Stimme ist im Meinungsbild.')).toBeVisible();
});

test('Wisch-Slider: ein kurzer Wisch reicht nicht, ein ganzer schon', async ({ page }) => {
  await page.goto('/stimme');
  await page.getByRole('radio', { name: 'dafür' }).click();
  const knob = page.locator('.swipe-track');
  const box = (await page.getByTestId('swipe-slider').boundingBox())!;
  const start = (await knob.boundingBox())!;
  const y = start.y + start.height / 2;

  await page.mouse.move(start.x + 10, y);
  await page.mouse.down();
  await page.mouse.move(start.x + 80, y, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText('Deine Stimme ist im Meinungsbild.')).toHaveCount(0);
  // The knob springs back to the start; wait until it has arrived before grabbing it again.
  await expect.poll(async () => (await knob.boundingBox())!.x).toBeLessThan(start.x + 1);

  await page.mouse.move(start.x + 10, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 20, y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByText('Deine Stimme ist im Meinungsbild.')).toBeVisible();
});

test('Eigene Umfrage: Ergebnisse erst ab 20 Antworten', async ({ page }) => {
  await page.goto('/mitmachen/umfrage');
  await expect(page.getByTestId('survey-locked')).toContainText('14 Antworten');
  await expect(page.getByTestId('survey-results')).toHaveCount(0);

  await page.getByRole('button', { name: /\+5 Antworten/ }).click();
  await expect(page.getByTestId('survey-locked')).toContainText('19 Antworten');
  await expect(page.getByTestId('survey-results')).toHaveCount(0);

  await page.getByRole('button', { name: /\+5 Antworten/ }).click();
  await expect(page.getByTestId('survey-results')).toBeVisible();
  await expect(page.getByText('nicht repräsentativ').first()).toBeVisible();
});

test('Neutralitäts-Check erkennt den Testsatz und bietet eine neutrale Frage an', async ({ page }) => {
  await page.route('**/api/agents/neutrality', (route) => route.fulfill({ json: {
    issues: [{ original: 'unsinnigen', type: 'wertend', explanation: 'Wertet die Frage.' }, { original: 'auch gegen', type: 'suggestiv', explanation: 'Legt eine Antwort nahe.' }],
    neutralVersion: 'Wie bewertest du die geplanten Radwege?',
  } }));
  await page.goto('/mitmachen/umfrage');
  await page.getByRole('button', { name: 'Neutralität prüfen' }).click();
  // This page-level check uses a mocked model reply, so it does not need a running Ollama service.
  await expect(page.getByTestId('neutral-version')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Vorschlag übernehmen' }).click();
  const question = page.getByLabel('Deine Frage');
  await expect(question).not.toHaveValue('Bist du auch gegen die unsinnigen Radwege?');
  await expect(question).not.toHaveValue(/unsinnig/i);
  await expect(question).not.toHaveValue('');
});

test('Jede Seite hat Pro und Contra in gleicher Größe', async ({ page }) => {
  await page.goto('/mitmachen/petition?id=pet-platanen');
  const tiles = page.getByTestId('pro-contra').first().locator(':scope > div');
  const [a, b] = await Promise.all([tiles.nth(0).boundingBox(), tiles.nth(1).boundingBox()]);
  expect(Math.abs(a!.width - b!.width)).toBeLessThan(1);
  expect(Math.abs(a!.height - b!.height)).toBeLessThan(1);
});
