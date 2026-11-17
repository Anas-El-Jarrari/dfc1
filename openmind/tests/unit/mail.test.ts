import { afterEach, describe, expect, it } from 'vitest';
import { checkMail, isTestAddress, mailMode, missingSmtp, sendMail, senderName } from '@/core/mail';

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe('Mailversand', () => {
  it('ohne Einstellung: Demo-Modus, nichts geht raus', async () => {
    delete process.env.MAIL_MODE;
    expect(mailMode()).toBe('console');
    expect((await checkMail()).ok).toBe(true);
  });

  it('SMTP ohne Zugangsdaten sagt genau, was fehlt', async () => {
    process.env.MAIL_MODE = 'smtp';
    process.env.SMTP_HOST = 'smtp.example.org';
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    expect(missingSmtp()).toEqual(['SMTP_USER', 'SMTP_PASS']);
    const r = await checkMail();
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('SMTP_USER, SMTP_PASS');
  });

  it('Testadressen gehen nie wirklich raus, auch nicht im SMTP-Modus', async () => {
    for (const a of ['test-1@example.org', 'x@mail.example.com', 'a@schule.test', 'b@foo.invalid']) expect(isTestAddress(a)).toBe(true);
    for (const a of ['jemand@gmail.com', 'rat@duesseldorf.de', 'x@example.de', 'a@test.de']) expect(isTestAddress(a)).toBe(false);
    process.env.MAIL_MODE = 'smtp';
    delete process.env.SMTP_HOST; // would fail if it tried to connect
    const r = await sendMail({ to: 'test-empfang@example.org', subject: 's', text: 't' });
    expect(r.delivered).toBe(false);
  });

  it('Absender heißt „Name über OpenMind“, ein Name kann keine Kopfzeilen fälschen', () => {
    expect(senderName('Adrian')).toBe('Adrian über OpenMind');
    expect(senderName(null)).toBe('OpenMind');
    expect(senderName('Eva\r\nBcc: x@y.de <a@b.de>')).toBe('Eva Bcc: x@y.de a@b.de über OpenMind');
  });
});
