import type { Page } from '@playwright/test';

/** Signs in (unique address per call, so parallel workers never share and delete each other's account) with a fresh account through the demo link that the console mail mode returns. */
export async function signIn(page: Page, email = `test-${crypto.randomUUID()}@example.org`) {
  const res = await page.request.post('/api/auth/request', { data: { email } });
  const body = await res.json();
  if (!body.demoLink) throw new Error(`Anmeldung im Test fehlgeschlagen: ${JSON.stringify(body)}`);
  const { demoLink } = body;
  await page.request.get(demoLink);
  return email;
}
