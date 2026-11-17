import { createHash } from 'node:crypto';
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
vi.mock('node:dns/promises', () => ({ lookup: async () => [{ address: '93.184.215.14', family: 4 }] }));
import { db } from '@/core/db/client';
import * as s from '@/core/db/schema';
import { encryptToken, decryptToken } from '@/core/gmail/client';
import { startOAuth, finishOAuth } from '@/core/gmail/oauth';
import { prepareReview, submitReview } from '@/core/gmail/service';
import { loadApplication } from '@/core/research/drafts';
import { result, original } from '../fixtures/application';
import { POST as sendRoute } from '@/app/api/submissions/route';
import { POST as saveRoute } from '@/app/api/drafts/route';
import { POST as applicationRoute } from '@/app/api/agents/application/route';
const origin = 'http://localhost:3000';
const session = 'session-fixture';
let userId: string, draftId: string, runId: string;
let sendCalls = 0, raws: string[] = [], sendBehavior: 'ok' | 'timeout' | 'rejected' = 'ok';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const req = (path: string, body: unknown, cookie = session) => new Request(origin + path, { method: 'POST', headers: { origin, cookie: 'om_session=' + cookie }, body: JSON.stringify(body) });
beforeAll(async () => { await migrate(db, { migrationsFolder: 'core/db/migrations' }); });
beforeEach(async () => {
  await db.delete(s.users);
  sendCalls = 0; raws = []; sendBehavior = 'ok';
  process.env.GMAIL_CLIENT_ID = 'fixture-client';
  process.env.GMAIL_CLIENT_SECRET = 'fixture-secret';
  process.env.GMAIL_TOKEN_KEY = Buffer.alloc(32, 7).toString('base64');
  process.env.APP_URL = origin;
  const [user] = await db.insert(s.users).values({ email: 'owner@example.org', name: 'Mira' }).returning();
  userId = user.id;
  await db.insert(s.profiles).values({ userId, district: original.location, onboarded: true });
  await db.insert(s.settings).values({ userId });
  await db.insert(s.sessions).values({ tokenHash: hash(session), userId, expiresAt: Date.now() + 60_000 });
  await db.insert(s.gmailAccounts).values({ userId, email: 'connected@example.org', refreshToken: encryptToken('refresh-fixture') });
  const [draft] = await db.insert(s.drafts).values({ userId, type: 'antrag', title: original.title, ownText: original.ownText,
    content: { procedureId: original.procedureId, answers: original.answers, subject: result.draft.subject, body: result.draft.body, aiShare: 80,
      recipientEmail: result.routing.contacts[0].value, recipientSourceUrl: result.sources[0].url } }).returning();
  draftId = draft.id;
  const { fingerprint } = await loadApplication(userId, draftId);
  const [run] = await db.insert(s.agentRuns).values({ userId, draftId, fingerprint, result: structuredClone(result) }).returning(); runId = run.id;
  await db.update(s.drafts).set({ content: { ...draft.content, agentRunId: runId } }).where(eq(s.drafts.id, draftId));
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith('https://station.example.org')) return new Response('<p>Reinigung: reinigung@station.example.org; Service: service@station.example.org</p>', { headers: { 'content-type': 'text/html' } });
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'access-fixture', refresh_token: 'refresh-fixture', scope: 'openid email https://www.googleapis.com/auth/gmail.send' });
    if (url === 'https://openidconnect.googleapis.com/v1/userinfo') return Response.json({ email: 'connected@example.org', email_verified: true });
    if (String(url).endsWith('/api/chat')) return Response.json({ message: { content: JSON.stringify(result.guardian) } });
    if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
      sendCalls++; raws.push(Buffer.from(JSON.parse(String(init?.body)).raw, 'base64url').toString());
      if (sendBehavior === 'timeout') throw new Error('network timeout after Google may have accepted');
      if (sendBehavior === 'rejected') return new Response('{}', { status: 403 });
      return Response.json({ id: 'mail-fixture-' + sendCalls });
    }
    throw new Error('Unexpected network call: ' + url);
  }));
});
afterAll(() => { db.$client.close(); });
async function edit(patch: Record<string, unknown>) {
  const [draft] = await db.select().from(s.drafts).where(eq(s.drafts.id, draftId));
  await db.update(s.drafts).set({ content: { ...draft.content, ...patch } }).where(eq(s.drafts.id, draftId));
}
describe('Gmail OAuth pro Konto', () => {
  it('speichert Token verschlüsselt und bindet OAuth an Sitzung und einmaligen State', async () => {
    const encrypted = encryptToken('refresh-private');
    expect(encrypted).not.toContain('refresh-private'); expect(decryptToken(encrypted)).toBe('refresh-private');
    const url = new URL(await startOAuth(req('/start', {}), userId, '/mitmachen/antrag?entwurf=' + draftId));
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    const callback = origin + '/api/mail/oauth/callback?code=fixture&state=' + url.searchParams.get('state');
    await expect(finishOAuth(new Request(callback, { headers: { cookie: 'om_session=another-session' } }), userId)).rejects.toThrow('Sitzung');
    expect(await finishOAuth(new Request(callback, { headers: { cookie: 'om_session=' + session } }), userId)).toContain('?entwurf=' + draftId);
    await expect(finishOAuth(new Request(callback, { headers: { cookie: 'om_session=' + session } }), userId)).rejects.toThrow('abgelaufen');
    const [account] = await db.select().from(s.gmailAccounts).where(eq(s.gmailAccounts.userId, userId));
    expect(account.refreshToken).not.toBe('refresh-fixture'); expect(sendCalls).toBe(0);
  });
  it('verweigert fremde Rücksprungadresse und ungültigen State', async () => {
    await expect(startOAuth(req('/start', {}), userId, 'https://evil.example.org')).rejects.toThrow('Rücksprung');
    await expect(finishOAuth(new Request(origin + '/callback?state=wrong&code=fake', { headers: { cookie: 'om_session=' + session } }), userId)).rejects.toThrow('abgelaufen');
  });
});
describe('Geprüfte Mail und ausdrückliche Freigabe', () => {
  it('die Vorbereitung sendet nichts; tatsächliche Mail geht ohne Umleitung an den sichtbaren Empfänger', async () => {
    const review = await prepareReview(userId, draftId);
    expect(sendCalls).toBe(0);
    expect(review.payload).toMatchObject({ sender: 'connected@example.org', recipient: 'reinigung@station.example.org', subject: result.draft.subject, body: result.draft.body });
    expect((await sendRoute(req('/api/submissions', { reviewId: review.reviewId }))).status).toBe(400);
    expect((await sendRoute(new Request(origin + '/api/submissions', { method: 'POST', headers: { origin: 'https://evil.example.org', cookie: 'om_session=' + session }, body: JSON.stringify({ reviewId: review.reviewId, confirmed: true }) }))).status).toBe(403);
    expect((await sendRoute(req('/api/submissions', { reviewId: review.reviewId, confirmed: true }, 'unknown'))).status).toBe(401);
    const response = await sendRoute(req('/api/submissions', { reviewId: review.reviewId, confirmed: true }));
    expect(response.status).toBe(200);
    expect((await response.json()).submission.body).toBe(result.draft.body);
    expect(sendCalls).toBe(1); expect(raws[0]).toContain('To: reinigung@station.example.org'); expect(raws[0]).toContain('From: connected@example.org');
    expect(raws[0]).not.toMatch(/\r\n(?:Cc|Bcc):/i);
  });
  it('gleichzeitige und wiederholte Freigaben verursachen nur eine Gmail-Anfrage', async () => {
    const { reviewId } = await prepareReview(userId, draftId);
    const outcomes = await Promise.allSettled([submitReview(userId, reviewId), submitReview(userId, reviewId)]);
    expect(outcomes.some((o) => o.status === 'fulfilled')).toBe(true);
    expect(sendCalls).toBe(1);
    expect((await submitReview(userId, reviewId)).repeated).toBe(true);
    expect(sendCalls).toBe(1);
  });
  it('geänderter Empfänger oder Text macht die Freigabe ungültig; geprüfte Änderungen können erneut freigegeben werden', async () => {
    const review = await prepareReview(userId, draftId);
    await edit({ recipientEmail: 'service@station.example.org', body: result.draft.body + '\nBitte antworten Sie per E-Mail.' });
    await expect(submitReview(userId, review.reviewId)).rejects.toThrow('geändert');
    const changed = await prepareReview(userId, draftId);
    expect(changed.payload.recipient).toBe('service@station.example.org');
    expect(changed.payload.body).toContain('Bitte antworten');
    expect(sendCalls).toBe(0);
  });
  it('blockiert unbelegte Adressen, fehlende Gmail-Verbindung und Formularwege', async () => {
    await edit({ recipientEmail: 'invented@station.example.org' });
    await expect(prepareReview(userId, draftId)).rejects.toThrow('steht nicht');
    await edit({ recipientEmail: result.routing.contacts[0].value });
    await db.update(s.agentRuns).set({ result: { ...result, routing: { ...result.routing, method: 'form' } } }).where(eq(s.agentRuns.id, runId));
    await expect(prepareReview(userId, draftId)).rejects.toThrow('kein E-Mail-Versand');
    await db.delete(s.gmailAccounts).where(eq(s.gmailAccounts.userId, userId));
    await expect(prepareReview(userId, draftId)).rejects.toThrow('Gmail-Konto');
    expect(sendCalls).toBe(0);
  });
  it('beachtet den gespeicherten Standort und verweigert fehlende/veraltete Ortsdaten', async () => {
    expect((await loadApplication(userId, draftId)).input.location).toBe(original.location);
    const review = await prepareReview(userId, draftId);
    await db.update(s.profiles).set({ district: 'Köln' }).where(eq(s.profiles.userId, userId));
    await expect(submitReview(userId, review.reviewId)).rejects.toThrow('geändert');
    await expect(prepareReview(userId, draftId)).rejects.toThrow('Profilstandort');
    await db.update(s.profiles).set({ district: null }).where(eq(s.profiles.userId, userId));
    await expect(loadApplication(userId, draftId)).rejects.toThrow('Ort im Profil');
    expect(sendCalls).toBe(0);
  });
  it('blockiert fremde Entwürfe, fremde Freigaben und abgelaufene Prüfungen', async () => {
    await expect(prepareReview('other-user', draftId)).rejects.toThrow('nicht gefunden');
    const { reviewId } = await prepareReview(userId, draftId);
    await expect(submitReview('other-user', reviewId)).rejects.toThrow('nicht gefunden');
    await db.update(s.mailReviews).set({ expiresAt: 0 }).where(eq(s.mailReviews.id, reviewId));
    await expect(submitReview(userId, reviewId)).rejects.toThrow('abgelaufen');
    expect(sendCalls).toBe(0);
  });
  it('blockiert einen nicht bestandenen Guardian auch nach Bearbeitung', async () => {
    await edit({ body: result.draft.body + '\nNeue Behauptung.' });
    const normal = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => String(url).endsWith('/api/chat')
      ? Response.json({ message: { content: JSON.stringify({ ...result.guardian, pass: false, unsupportedClaims: ['Unbelegte Behauptung'] }) } }) : normal(url, init)));
    await expect(prepareReview(userId, draftId)).rejects.toThrow('Unbelegte Behauptung');
    expect(sendCalls).toBe(0);
  });
  it('nach unklarem Google-Timeout bleiben Wiederholung und Bearbeitung gesperrt', async () => {
    const { reviewId } = await prepareReview(userId, draftId);
    sendBehavior = 'timeout';
    await expect(submitReview(userId, reviewId)).rejects.toThrow('könnte gesendet');
    await expect(submitReview(userId, reviewId)).rejects.toThrow('bereits gestartet');
    await expect(prepareReview(userId, draftId)).rejects.toThrow('bereits ein Versand');
    const response = await saveRoute(req('/api/drafts', { id: draftId, type: 'antrag', content: { procedureId: original.procedureId } }));
    expect(response.status).toBe(409);
    const [delivery] = await db.select().from(s.mailDeliveries).where(eq(s.mailDeliveries.draftId, draftId));
    expect(delivery.state).toBe('uncertain'); expect(sendCalls).toBe(1);
  });
  it('eindeutige Ablehnung erfordert neue Prüfung und neue ausdrückliche Freigabe', async () => {
    const first = await prepareReview(userId, draftId); sendBehavior = 'rejected';
    await expect(submitReview(userId, first.reviewId)).rejects.toThrow('abgelehnt');
    await expect(submitReview(userId, first.reviewId)).rejects.toThrow('erneut');
    sendBehavior = 'ok';
    const next = await prepareReview(userId, draftId);
    expect(next.reviewId).not.toBe(first.reviewId);
    await expect(submitReview(userId, next.reviewId)).resolves.toMatchObject({ repeated: false });
    expect(sendCalls).toBe(2);
  });
  it('liefert gespeicherte Recherche als Stream ohne erneute Modellaufrufe', async () => {
    const response = await applicationRoute(req('/api/agents/application', { draftId }));
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const event = JSON.parse((await response.text()).split('data: ')[1].trim());
    expect(event).toMatchObject({ type: 'complete', runId, cached: true, result: { location: original.location } });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});

