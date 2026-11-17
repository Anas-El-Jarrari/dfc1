import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { original, result } from '../fixtures/application';
const REVIEW = 'review-simulated-1';
function researchStream(value = result) {
  const events = ['intake', 'research', 'routing', 'draft', 'guardian'].flatMap((id) => [
    { type: 'stage', id, name: id, status: 'working', model: 'qwen3:8b' },
    { type: 'stage', id, name: id, status: 'done', model: 'qwen3:8b' },
  ]);
  events.push({ type: 'complete', runId: 'run-simulated-1', result: value, cached: false } as never);
  return events.map((event) => 'data: ' + JSON.stringify(event) + '\n\n').join('');
}
async function mocks(page: Page, value = result) {
  await page.route('**/api/agents/intake', (r) => r.fulfill({ json: { intent: value.intake, model: value.model } }));
  await page.route('**/api/agents/application', (r) => r.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: researchStream(value) }));
  await page.route('**/api/mail/status', (r) => r.fulfill({ json: { configured: true, authorized: true, email: 'connected@example.org' } }));
  await page.route('**/api/mail/review', (r) => r.fulfill({ json: { reviewId: REVIEW, expiresAt: Date.now() + 60_000,
    payload: { sender: 'connected@example.org', recipient: result.routing.contacts[0].value, sourceUrl: result.sources[0].url,
      subject: result.draft.subject, body: result.draft.body, aiShare: 80, fingerprint: 'fixture', runId: 'run-simulated-1' } } }));
  let sends = 0;
  await page.route('**/api/submissions', async (r) => {
    if (r.request().method() === 'GET') return r.continue();
    sends++; await r.fulfill({ json: { submission: { id: 'sent-fixture', recipient: result.routing.contacts[0].value, status: 'gesendet' } } });
  });
  return () => sends;
}
async function fillStart(page: Page, text = original.ownText) {
  await page.goto('/mitmachen/antrag');
  await page.getByLabel('Was möchtest du verändern?').fill(text);
  await page.getByRole('button', { name: 'Anliegen verstehen' }).click();
  await expect(page.getByText('So habe ich dein Anliegen verstanden')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByRole('button', { name: /Anregung an den Rat/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Passt', exact: true }).click();
  await page.getByLabel('Wo genau ist das?').fill(original.answers.ort);
  await page.getByLabel('Wen betrifft es?').fill(original.answers.betroffen);
  await page.getByLabel('Was wünschst du dir konkret?').fill(original.answers.ziel);
}
test.beforeEach(async ({ page }) => { await signIn(page); });
test.afterEach(async ({ page }) => { await page.request.delete('/api/me'); });

test('Profilort und Anliegen führen durch Agenten, Vorschau und eine simulierte Gmail-Bestätigung', async ({ page }) => {
  const sends = await mocks(page);
  await fillStart(page);
  await page.getByRole('button', { name: /Zuständigkeit und Möglichkeiten prüfen/ }).click();
  await expect(page.getByRole('heading', { name: 'Das kannst du tun' })).toBeVisible();
  await page.getByRole('heading', { name: 'Das kannst du tun' }).click();
  await expect(page.getByText('Bahnhofsmanagement')).toBeVisible();
  await expect(page.getByText(/qwen3:8b/).first()).toBeVisible();
  await page.getByText('Rechtsgrundlagen und Quellen').click();
  await expect(page.getByText(result.sources[0].title)).toBeVisible();
  await expect(page.getByText(/Gegenseite/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Zum Nachrichtentwurf' }).click();
  await expect(page.getByRole('textbox', { name: 'Empfänger' })).toHaveValue('reinigung@station.example.org');
  await expect(page.getByTestId('ownership-text')).toContainText('Uringeruch');
  await page.getByRole('button', { name: 'Weiter zum Prüfen' }).click();
  await page.getByRole('button', { name: 'Kontakt prüfen und Vorschau öffnen' }).click();
  await expect(page.getByTestId('mail-preview')).toContainText('connected@example.org');
  await expect(page.getByRole('textbox', { name: 'Empfänger' })).toHaveValue('reinigung@station.example.org');
  await page.getByRole('checkbox').check();
  const slider = page.getByTestId('swipe-slider');
  await expect(slider).toHaveAttribute('aria-disabled', 'false');
  await slider.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Gesendet' })).toBeVisible();
  expect(sends()).toBe(1);
  expect((await (await page.request.get('/api/submissions')).json()).submissions).toHaveLength(0);
});

test('Straßenanliegen bleibt konkret; Vorschlag wird nur durch Auswahl ergänzt', async ({ page }) => {
  const crossing = structuredClone(result);
  crossing.intake = { ...result.intake, summary: 'Sicherer Schulweg ohne Übergang', issue: 'An der Straße fehlt ein sicherer Übergang zur Schule',
    goal: 'Sichere Querungsmöglichkeiten für den Schulweg prüfen', explicitLocation: '', affected: 'Kinder',
    confirmedDetails: ['Die Stelle liegt auf einem Schulweg.'], needsExactLocation: true,
    openQuestions: [{ field: 'ort', question: 'Welche Straße oder Kreuzung meinst du?', reason: 'Die Stelle muss auffindbar sein.' }],
    searchTerms: ['Düsseldorf sicherer Schulweg Übergang Kontakt', 'Düsseldorf Querung zuständige Stelle', 'Schulweg Übergang Rechtsgrundlage'] };
  crossing.draft = { subject: 'Sicherer Übergang zur Schule: Bitte Prüfung an der Musterstraße',
    body: 'Sehr geehrte Damen und Herren,\n\nan der Musterstraße fehlt ein sicherer Übergang zur Schule. Ich wünsche mir sichere Querungsmöglichkeiten für den Schulweg. Bitte prüfen Sie, ob ein sicherer Übergang eingerichtet werden kann, und teilen Sie mir das Ergebnis mit.\n\nMit freundlichen Grüßen',
    counterposition: 'Eine neue Querung muss mit Verkehrsfluss und Kosten abgewogen werden.' };
  const sends = await mocks(page, crossing);
  const text = 'An meiner Straße fehlt ein sicherer Übergang zur Schule. Ich wünsche mir sichere Querungsmöglichkeiten für Kinder.';
  await page.goto('/mitmachen/antrag');
  await page.getByLabel('Was möchtest du verändern?').fill(text);
  await page.getByRole('button', { name: 'Anliegen verstehen' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Passt', exact: true }).click();
  const wish = page.getByLabel('Was wünschst du dir konkret?');
  const originalWish = await wish.inputValue();
  expect(originalWish).toContain('Sichere Querungsmöglichkeiten');
  const selected = 'Bitte mögliche Lösungen wie Ampel oder Zebrastreifen prüfen.';
  await page.getByRole('button', { name: '+ ' + selected }).click();
  await expect(wish).toHaveValue(originalWish + '\n' + selected);
  await expect(page.getByRole('button', { name: /Zuständigkeit und Möglichkeiten prüfen/ })).toBeDisabled();
  await page.getByLabel('Wo genau ist das?').fill('Musterstraße');
  await expect(page.getByRole('button', { name: /Zuständigkeit und Möglichkeiten prüfen/ })).toBeEnabled();
  await page.getByRole('button', { name: /Zuständigkeit und Möglichkeiten prüfen/ }).click();
  await expect(page.getByRole('heading', { name: 'Das kannst du tun' })).toBeVisible();
  await page.getByRole('button', { name: 'Zum Nachrichtentwurf' }).click();
  await expect(page.getByTestId('ownership-text')).toContainText('sicherer Übergang zur Schule');
  await expect(page.getByTestId('ownership-text')).toContainText('Bitte prüfen Sie, ob ein sicherer Übergang eingerichtet werden kann');
  expect(sends()).toBe(0);
});

test('unvollständiger Text fragt nach Straße und gewünschter Handlung statt etwas zu erfinden', async ({ page }) => {
  const incomplete = structuredClone(result);
  incomplete.intake = { ...result.intake, summary: 'Fehlender Übergang', issue: 'An einer Straße fehlt ein sicherer Übergang', goal: '', explicitLocation: '', affected: '',
    confirmedDetails: [], needsExactLocation: true,
    openQuestions: [
      { field: 'ort', question: 'Welche Straße oder Kreuzung meinst du?', reason: 'Die Stelle muss für die zuständige Stelle auffindbar sein.' },
      { field: 'ziel', question: 'Was soll die zuständige Stelle konkret ändern?', reason: 'Ein gewünschtes Ergebnis wurde noch nicht genannt.' },
    ], searchTerms: ['sicherer Übergang Düsseldorf Kontakt', 'Schulweg Querung zuständig', 'sicherer Übergang Rechtsgrundlage'] };
  const sends = await mocks(page, incomplete);
  await page.goto('/mitmachen/antrag');
  await page.getByLabel('Was möchtest du verändern?').fill('An meiner Straße fehlt ein sicherer Übergang.');
  await page.getByRole('button', { name: 'Anliegen verstehen' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Passt', exact: true }).click();
  await expect(page.getByText('Noch 2 gezielte Rückfragen')).toBeVisible();
  const continueButton = page.getByRole('button', { name: /Zuständigkeit und Möglichkeiten prüfen/ });
  await expect(continueButton).toBeDisabled();
  await page.getByLabel('Wo genau ist das?').fill('Musterstraße');
  await expect(continueButton).toBeDisabled();
  await page.getByRole('button', { name: /\+ Bitte prüfen, ob ein sicherer Übergang eingerichtet werden kann/ }).click();
  await expect(page.getByLabel('Was wünschst du dir konkret?')).toHaveValue(/Bitte prüfen/);
  await expect(continueButton).toBeEnabled();
  expect(sends()).toBe(0);
});

test('Textänderungen machen eine Freigabe ungültig; Mehrfachklick sendet im Browsermock einmal', async ({ page }) => {
  const sends = await mocks(page);
  await fillStart(page);
  await page.getByRole('button', { name: /Zuständigkeit und Möglichkeiten prüfen/ }).click();
  await page.getByRole('button', { name: 'Zum Nachrichtentwurf' }).click();
  await page.getByRole('button', { name: 'Weiter zum Prüfen' }).click();
  await page.getByRole('button', { name: 'Kontakt prüfen und Vorschau öffnen' }).click();
  await page.getByRole('checkbox').check();
  await page.getByLabel('Vollständiger Nachrichtentext').fill(result.draft.body + '\nBitte prüfen Sie die Stelle zeitnah.');
  await expect(page.getByRole('button', { name: 'Nachricht erneut prüfen' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nachricht erneut prüfen' }).click();
  await page.getByRole('checkbox').check();
  const slider = page.getByTestId('swipe-slider');
  await slider.focus(); await page.keyboard.press('Enter'); await slider.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Gesendet' })).toBeVisible();
  expect(sends()).toBe(1);
});

test('bei reinem Formularweg gibt es einen Link, aber keinen Mailversand', async ({ page }) => {
  const form = structuredClone(result);
  form.routing.method = 'form';
  form.routing.contacts = [{ kind: 'form', value: 'https://station.example.org/formular', sourceId: 1, purpose: 'Hinweisformular' }];
  await mocks(page, form);
  await fillStart(page);
  await page.getByRole('button', { name: /Zuständigkeit und Möglichkeiten prüfen/ }).click();
  await page.getByRole('button', { name: 'Zum Nachrichtentwurf' }).click();
  await page.getByRole('button', { name: 'Weiter zum Prüfen' }).click();
  await expect(page.getByRole('link', { name: 'Offizielles Formular öffnen ↗' })).toHaveAttribute('href', 'https://station.example.org/formular');
  await expect(page.getByRole('button', { name: /Kontakt prüfen/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Recherche erneut starten' })).toBeVisible();
});

test('Zurück und vorwärts behalten eigene Worte und Eingaben', async ({ page }) => {
  await mocks(page);
  await page.goto('/mitmachen/antrag');
  const text = 'An der Haltestelle Rath riecht es regelmäßig nach Urin.';
  await page.getByLabel('Was möchtest du verändern?').fill(text);
  await page.getByRole('button', { name: 'Anliegen verstehen' }).click();
  await expect(page.getByText('So habe ich dein Anliegen verstanden')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Passt', exact: true }).click();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByLabel('Was möchtest du verändern?')).toHaveValue(text);
  await page.getByRole('button', { name: 'Anliegen verstehen' }).click();
  await expect(page.getByText('So habe ich dein Anliegen verstanden')).toBeVisible();
  await expect(page.getByText(text)).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Passt', exact: true }).click();
  await expect(page.getByLabel('Was wünschst du dir konkret?')).toHaveValue(result.intake.goal);
  await expect(page.getByLabel('Was möchtest du verändern?')).toHaveCount(0);
});

