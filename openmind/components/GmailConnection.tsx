'use client';
import { useEffect, useState } from 'react';
import type { GmailStatus } from '@/core/gmail/types';
export default function GmailConnection({ returnPath, beforeConnect, onStatus }: {
  returnPath?: string; beforeConnect?: () => Promise<string | undefined>; onStatus?: (status: GmailStatus) => void;
}) {
  const [status, setStatus] = useState<GmailStatus>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/mail/status').then(async (r) => { const v = await r.json(); if (!r.ok) throw new Error(v.error); return v; })
      .then((v) => { if (active) { setStatus(v); onStatus?.(v); } }).catch(() => { if (active) setError('Gmail-Status konnte nicht geladen werden.'); });
    const oauthError = new URLSearchParams(window.location.search).get('gmailError');
    if (oauthError) setError(oauthError);
    return () => { active = false; };
  }, [onStatus]);
  async function connect() {
    setBusy(true); setError('');
    try {
      const savedPath = await beforeConnect?.();
      const r = await fetch('/api/mail/oauth/start', { method: 'POST', body: JSON.stringify({ returnPath: savedPath || returnPath || window.location.pathname + window.location.search }) });
      const value = await r.json(); if (!r.ok) throw new Error(value.error);
      window.location.assign(value.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen.'); setBusy(false); }
  }
  async function disconnect() {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/mail/disconnect', { method: 'POST' });
      if (!r.ok) throw new Error('Trennen fehlgeschlagen.');
      const next = { configured: Boolean(status?.configured), authorized: false, email: null };
      setStatus(next); onStatus?.(next);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="card grid gap-3" aria-label="Gmail-Verbindung">
    <h2 className="text-lg">Dein Gmail-Konto</h2>
    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{!status ? 'Verbindung wird geprüft …' : status.authorized ? 'Verbunden: ' + status.email : status.configured ? 'Verbinde Gmail, um geprüfte Schreiben selbst abzusenden.' : 'Gmail muss auf dem Server eingerichtet werden. Du kannst Entwürfe bereits vorbereiten.'}</p>
    {status?.configured && <button type="button" className="btn-secondary" disabled={busy} onClick={connect}>{busy ? 'Bitte warten …' : status.authorized ? 'Konto wechseln / neu verbinden' : 'Gmail verbinden'}</button>}
    {status?.authorized && <button type="button" className="text-sm underline min-h-[44px]" disabled={busy} onClick={disconnect}>Verbindung trennen</button>}
    {error && <p role="alert" style={{ color: 'var(--contra-text)' }}>{error}</p>}
  </section>;
}

