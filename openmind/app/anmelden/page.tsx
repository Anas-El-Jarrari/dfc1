'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Mail } from 'lucide-react';
import KimBase from '@/components/Kim';
import { knownAccounts, useSession } from '@/ui';

function SignIn() {
  const failed = useSearchParams().get('fehler');
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [known, setKnown] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(failed ? 'Der Link ist abgelaufen oder wurde schon benutzt. Fordere einen neuen an.' : '');
  const [sent, setSent] = useState<{ demoLink?: string }>();

  useEffect(() => setKnown(knownAccounts()), []);
  useEffect(() => {
    if (status === 'in') window.location.href = '/';
  }, [status]);

  const request = async (address: string) => {
    setBusy(true);
    setError('');
    const r = await fetch('/api/auth/request', { method: 'POST', body: JSON.stringify({ email: address }) }).then((x) => x.json()).catch(() => ({ error: 'Keine Verbindung.' }));
    setBusy(false);
    if (r.error) setError(r.error.includes('Eingabe') ? 'Bitte gib eine gültige E-Mail-Adresse ein.' : r.error);
    else setSent(r);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" className="grid gap-5 justify-items-center w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <KimBase pose="wait" size={130} />
            <h1 className="text-3xl">Schau in dein Postfach</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Der Link an <strong>{email}</strong> gilt 15 Minuten.</p>
            {sent.demoLink && (
              <a href={sent.demoLink} className="btn-primary" data-testid="demo-login">Demo: direkt anmelden</a>
            )}
            <button className="font-bold min-h-[44px]" style={{ color: 'var(--primary)' }} onClick={() => setSent(undefined)}>Andere Adresse</button>
          </motion.div>
        ) : (
          <motion.form key="form" className="grid gap-5 justify-items-center w-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} onSubmit={(e) => { e.preventDefault(); request(email); }}>
            <KimBase pose="listen" size={130} />
            <h1 className="text-3xl">Schön, dass du da bist</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Kein Passwort nötig. Du bekommst einen Link.</p>
            {known.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center" role="group" aria-label="Zuletzt genutzte Konten">
                {known.map((k) => <button type="button" key={k} className="pill" aria-pressed={email === k} onClick={() => setEmail(k)}>{k}</button>)}
              </div>
            )}
            <label className="w-full text-left grid gap-1">
              <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>E-Mail</span>
              <input className="search-input !pl-4 !py-4" type="email" inputMode="email" autoComplete="email" required placeholder="du@beispiel.de" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {error && <p role="alert" className="rounded-2xl px-4 py-3 text-sm font-semibold w-full" style={{ background: 'var(--contra-bg)', color: 'var(--contra-text)' }}>{error}</p>}
            <button className="btn-primary gap-2" disabled={busy || !email.trim()}><Mail size={20} aria-hidden />{busy ? 'Sende …' : 'Link senden'}</button>
            <a href="/datenschutz" className="text-sm font-bold min-h-[44px] flex items-center" style={{ color: 'var(--text-secondary)' }}>Was passiert mit meinen Daten?</a>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Page() {
  return <Suspense><SignIn /></Suspense>;
}
