// Sends one test mail with the settings from .env.local: npm run mail:test -- adresse@example.org
try { process.loadEnvFile('.env.local'); } catch { /* no file: the checks below say what is missing */ }

const to = process.argv[2];
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.log('So geht es: npm run mail:test -- deine@adresse.de');
  process.exit(1);
}

const { checkMail, mailMode, sendMail } = await import('../core/mail');
if (mailMode() !== 'smtp') {
  console.log('MAIL_MODE ist nicht "smtp". Trag in .env.local MAIL_MODE=smtp ein, sonst erscheinen Mails nur im Terminal.');
  process.exit(1);
}

const check = await checkMail();
console.log(`${check.ok ? '✓' : '✗'} ${check.detail}`);
if (!check.ok) process.exit(1);

try {
  const { id } = await sendMail({
    to,
    subject: 'OpenMind: Testmail',
    text: 'Hallo!\n\nWenn du das liest, funktioniert der Mailversand von OpenMind.\n\nViele Grüße\nKim',
  });
  console.log(`✓ Testmail an ${to} gesendet (${id}). Schau auch im Spam-Ordner nach.`);
  process.exit(0);
} catch (e) {
  console.log(`✗ Senden fehlgeschlagen: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
