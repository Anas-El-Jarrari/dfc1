import type { Transporter } from 'nodemailer';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  cc?: string;
  replyTo?: string;
  /** The person on whose behalf the app sends; shown as "Name über OpenMind". */
  onBehalfOf?: string | null;
}

/** "Name über OpenMind" (or just "OpenMind"). Quotes, angle brackets and line breaks are removed, so a name cannot forge headers. */
export function senderName(onBehalfOf?: string | null) {
  const name = (onBehalfOf ?? '').replace(/[\r\n"<>\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return name ? `${name} über OpenMind` : 'OpenMind';
}

/** The sending address: from MAIL_FROM ("Name <adresse>") or else the SMTP login. */
function senderAddress() {
  const from = process.env.MAIL_FROM?.trim() ?? '';
  return from.match(/<([^>]+)>/)?.[1] ?? (from.includes('@') ? from : process.env.SMTP_USER ?? '');
}

export const mailMode = () => (process.env.MAIL_MODE === 'smtp' ? 'smtp' : 'console');

/**
 * Reserved test addresses (RFC 2606/6761: example.org/.com/.net, *.test, *.invalid, *.localhost).
 * They are never sent for real, so tests cannot bounce mails through the real account.
 */
export function isTestAddress(address: string) {
  return /@(?:[^@\s]+\.)?(?:example\.(?:org|com|net)|[^@\s]+\.(?:test|invalid|localhost))$/i.test(address.trim());
}

/** SMTP settings that are still empty. */
export function missingSmtp() {
  return (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const).filter((k) => !process.env[k]?.trim());
}

async function transport(): Promise<Transporter> {
  const missing = missingSmtp();
  if (missing.length) throw new Error(`Es fehlt in .env.local: ${missing.join(', ')}`);
  const { createTransport } = await import('nodemailer');
  const port = Number(process.env.SMTP_PORT || 587);
  return createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    // A slow or wrong server should fail fast, not keep the person waiting at the slider.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS?.replace(/\s+/g, '') },
  });
}

/**
 * Sends a mail through the configured adapter.
 * console: prints it to the terminal (demo, no account needed). smtp: real delivery via SMTP_* settings,
 * except to reserved test addresses, which are only printed.
 */
export async function sendMail(mail: Mail): Promise<{ id: string; delivered: boolean }> {
  if (mailMode() === 'console' || isTestAddress(mail.to)) {
    console.log(`\n📬 Mail von „${senderName(mail.onBehalfOf)}“${mail.replyTo ? ` (Antworten an ${mail.replyTo})` : ''} an ${mail.to}${mail.cc ? ` (Kopie: ${mail.cc})` : ''}\n   Betreff: ${mail.subject}\n\n${mail.text.replace(/^/gm, '   ')}\n`);
    return { id: `console-${Date.now()}`, delivered: false };
  }
  const { onBehalfOf, ...rest } = mail;
  const cc = mail.cc && !isTestAddress(mail.cc) ? mail.cc : undefined;
  // Sent through the OpenMind account (never a forged personal address); replies go straight to the person.
  const info = await (await transport()).sendMail({ ...rest, cc, from: { name: senderName(onBehalfOf), address: senderAddress() } });
  return { id: info.messageId, delivered: true };
}

/** For the status page: can we log in to the mail server? Never reveals the password. */
export async function checkMail(): Promise<{ ok: boolean; detail: string }> {
  if (mailMode() === 'console') return { ok: true, detail: 'Modus: console (Mails erscheinen nur im Terminal)' };
  const missing = missingSmtp();
  if (missing.length) return { ok: false, detail: `SMTP: es fehlt ${missing.join(', ')}` };
  try {
    await (await transport()).verify();
    return { ok: true, detail: `SMTP: Anmeldung bei ${process.env.SMTP_HOST} klappt` };
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
    const detail = code === 'EAUTH' ? 'Benutzer oder App-Passwort wird abgelehnt'
      : code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' ? 'Server nicht erreichbar (Host oder Port prüfen)'
      : code === 'EDNS' || code === 'ENOTFOUND' ? 'Server-Adresse unbekannt (SMTP_HOST prüfen)'
      : 'Verbindung fehlgeschlagen';
    return { ok: false, detail: `SMTP: ${detail}` };
  }
}
