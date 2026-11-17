import { createHash, randomBytes } from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/core/db/client';
import { gmailAccounts, gmailStates } from '@/core/db/schema';
import { SESSION_COOKIE } from '@/core/auth';
import { HttpError } from '@/core/http/safeRoute';
import { configured, encryptToken, gmailConfig } from './client';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function sessionHash(req: Request) {
  const token = (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(SESSION_COOKIE + '='))?.slice(SESSION_COOKIE.length + 1);
  if (!token) throw new HttpError(401, 'Bitte melde dich erneut an.');
  return hash(token);
}
export async function startOAuth(req: Request, userId: string, returnPath = '/ich') {
  if (!configured()) throw new HttpError(503, 'Gmail ist noch nicht eingerichtet. Ergänze die Gmail-Konfiguration auf dem Server.');
  const c = gmailConfig();
  // Never redirect to an external origin (including encoded slash/backslash variants).
  const returnUrl = new URL(returnPath, c.appUrl);
  if (returnUrl.origin !== new URL(c.appUrl).origin || /[\\\r\n]/.test(returnPath)) throw new HttpError(400, 'Ungültige Rücksprungadresse.');
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  await db.delete(gmailStates).where(lt(gmailStates.expiresAt, Date.now()));
  await db.insert(gmailStates).values({ stateHash: hash(state), userId, sessionHash: sessionHash(req), verifier,
    returnPath: returnUrl.pathname + returnUrl.search, expiresAt: Date.now() + 10 * 60_000 });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: c.clientId, redirect_uri: c.redirectUri, response_type: 'code',
    scope: 'openid email https://www.googleapis.com/auth/gmail.send', access_type: 'offline', prompt: 'consent select_account',
    state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  return url.href;
}
export async function finishOAuth(req: Request, userId: string) {
  const params = new URL(req.url).searchParams;
  const state = params.get('state') || '';
  const [row] = await db.delete(gmailStates).where(and(eq(gmailStates.stateHash, hash(state)), eq(gmailStates.userId, userId),
    eq(gmailStates.sessionHash, sessionHash(req)))).returning();
  if (!row || row.expiresAt < Date.now()) throw new HttpError(400, 'Diese Gmail-Anmeldung ist abgelaufen oder gehört zu einer anderen Sitzung.');
  if (params.has('error') || !params.get('code')) throw new HttpError(400, 'Die Gmail-Verbindung wurde nicht freigegeben.');
  const c = gmailConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(15_000),
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, code: params.get('code')!,
      code_verifier: row.verifier, grant_type: 'authorization_code', redirect_uri: c.redirectUri }), cache: 'no-store' });
  const token = await response.json();
  if (!response.ok || !token.access_token || !token.refresh_token ||
      !String(token.scope || '').split(' ').includes('https://www.googleapis.com/auth/gmail.send')) {
    throw new HttpError(400, 'Google hat keine dauerhafte Versandfreigabe erteilt. Verbinde Gmail erneut.');
  }
  const who = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + token.access_token },
    signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  const info = await who.json();
  if (!who.ok || info.email_verified !== true || typeof info.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) {
    throw new HttpError(400, 'Das verbundene Google-Konto konnte nicht bestätigt werden.');
  }
  const values = { email: info.email.toLowerCase(), refreshToken: encryptToken(token.refresh_token), connectedAt: new Date().toISOString() };
  await db.insert(gmailAccounts).values({ userId, ...values }).onConflictDoUpdate({ target: gmailAccounts.userId, set: values });
  return new URL(row.returnPath, c.appUrl).href;
}

