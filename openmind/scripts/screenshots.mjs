// Captures README screenshots at 390×844 with a signed-in demo account.
// Needs a running server (npm run dev or npm start) and a session token: npx tsx scripts/dev/session.mts
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const token = process.env.SESSION;
if (!token) throw new Error('SESSION fehlt: SESSION=$(npx tsx --tsconfig tsconfig.json scripts/dev/session.mts) node scripts/screenshots.mjs');

const shots = [
  ['anmelden', '/anmelden', false], ['tutorial', '/tutorial'], ['heute', '/entdecken'], ['themen', '/entdecken?tab=themen'],
  ['thema', '/thema/radwege-bilk'], ['mitmachen', '/mitmachen'], ['kim', '/frag-nach'], ['antrag', '/mitmachen/antrag'],
  ['check', '/check'], ['wirkung', '/wirkung'], ['ich', '/ich'], ['datenschutz', '/datenschutz'],
];
const browser = await chromium.launch();
for (const [name, path, signedIn = true] of shots) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  if (signedIn) await context.addCookies([{ name: 'om_session', value: token, url: base }]);
  // Hide one-time tips so every screenshot shows the screen itself.
  await context.addInitScript(() => { window.__hideTips = true; });
  const page = await context.newPage();
  await page.goto(base + path);
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelectorAll('[role="note"]').forEach((n) => n.remove()));
  await page.screenshot({ path: `docs/screenshots/${name}.png` });
  await context.close();
}
await browser.close();
