import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import MailComposer from 'nodemailer/lib/mail-composer';
import { eq } from 'drizzle-orm';
import { db } from '@/core/db/client';
import { gmailAccounts } from '@/core/db/schema';
import { HttpError } from '@/core/http/safeRoute';
import type { GmailStatus, MailPayload } from './types';

export function gmailConfig() {
  if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) throw new HttpError(503, 'APP_URL muss vor der Gmail-Einrichtung gesetzt werden.');
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return { appUrl, clientId: process.env.GMAIL_CLIENT_ID || '', clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    redirectUri: process.env.GMAIL_REDIRECT_URI || appUrl + '/api/mail/oauth/callback',
    tokenKey: process.env.GMAIL_TOKEN_KEY || '' };
}
export function configured() {
  const c = gmailConfig();
  return Boolean(c.clientId && c.clientSecret && Buffer.from(c.tokenKey, 'base64').length === 32);
}
function key() {
  const bytes = Buffer.from(gmailConfig().tokenKey, 'base64');
  if (bytes.length !== 32) throw new HttpError(503, 'Gmail ist noch nicht eingerichtet. GMAIL_TOKEN_KEY muss 32 zufällige Bytes in Base64 enthalten.');
  return bytes;
}
export function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((x) => x.toString('base64url')).join('.');
}
export function decryptToken(value: string) {
  try {
    const [iv, tag, data] = value.split('.').map((x) => Buffer.from(x, 'base64url'));
    const cipher = createDecipheriv('aes-256-gcm', key(), iv);
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
  } catch { throw new HttpError(503, 'Die Gmail-Verbindung kann nicht gelesen werden. Prüfe den Token-Schlüssel oder verbinde Gmail neu.'); }
}
export async function gmailStatus(userId: string): Promise<GmailStatus> {
  const [account] = await db.select().from(gmailAccounts).where(eq(gmailAccounts.userId, userId));
  return { configured: configured(), authorized: Boolean(account && configured()), email: account?.email || null };
}
export async function accessToken(userId: string) {
  if (!configured()) throw new HttpError(503, 'Gmail ist auf diesem Server noch nicht eingerichtet.');
  const [account] = await db.select().from(gmailAccounts).where(eq(gmailAccounts.userId, userId));
  if (!account) throw new HttpError(409, 'Verbinde zuerst dein Gmail-Konto.');
  const c = gmailConfig();
  let response: Response;
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret,
        refresh_token: decryptToken(account.refreshToken), grant_type: 'refresh_token' }),
      signal: AbortSignal.timeout(15_000), cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(503, 'Google ist gerade nicht erreichbar. Es wurde keine E-Mail gesendet.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.access_token !== 'string') throw new HttpError(409, 'Gmail hat die Anmeldung abgelehnt. Verbinde dein Gmail-Konto erneut.');
  return { token: result.access_token as string, email: account.email };
}
export class GmailSendError extends Error {
  constructor(public certainty: 'rejected' | 'uncertain') { super(certainty); }
}
export async function mimeMessage(payload: MailPayload, deliveryId: string) {
  if (/[\r\n]/.test(payload.subject + payload.sender + payload.recipient)) throw new HttpError(400, 'Mail-Kopfzeilen dürfen keinen Zeilenumbruch enthalten.');
  return new MailComposer({
    from: payload.sender, to: payload.recipient, subject: payload.subject, text: payload.body,
    messageId: '<' + deliveryId + '@openmind.local>',
  }).compile().build();
}
/** Only called after a durable delivery claim. Never retries an ambiguous request. */
export async function deliverGmail(token: string, payload: MailPayload, deliveryId: string) {
  const raw = (await mimeMessage(payload, deliveryId)).toString('base64url');
  let response: Response;
  try {
    response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }), signal: AbortSignal.timeout(30_000), cache: 'no-store',
    });
  } catch { throw new GmailSendError('uncertain'); }
  if (!response.ok) throw new GmailSendError(response.status >= 400 && response.status < 500 ? 'rejected' : 'uncertain');
  const result = await response.json().catch(() => ({}));
  if (typeof result.id !== 'string' || !result.id) throw new GmailSendError('uncertain');
  return result.id as string;
}

