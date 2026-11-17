'use client';
import { useEffect, useState } from 'react';

type Check = { ok: boolean; detail: string };
type Status = { ai: Check; db: Check; mail: Check; search: Check; gmail: { configured: boolean }; agents: string[]; error?: string };

export default function StatusPage() {
  const [s, setS] = useState<Status>();
  useEffect(() => {
    fetch('/api/status').then((r) => r.json()).then(setS).catch(() => setS(undefined));
  }, []);

  if (!s) return <p className="p-6" role="status">Prüfe …</p>;
  if (s.error) return <p className="p-6">{s.error}</p>;
  const rows: [string, Check][] = [['Lokale KI', s.ai], ['Recherche', s.search], ['Datenbank', s.db], ['Anmeldelinks', s.mail], ['Gmail-Versand', { ok: s.gmail.configured, detail: s.gmail.configured ? 'Server eingerichtet. Konto unter Ich verbinden.' : 'Gmail-Konfiguration fehlt.' }]];
  return (
    <div className="p-6 grid gap-4">
      <h1 className="text-2xl">Status</h1>
      <ul className="grid gap-2">
        {rows.map(([label, c]) => (
          <li key={label} className="card p-4 flex gap-3 items-center">
            <span aria-hidden className="text-xl">{c.ok ? '✅' : '❌'}</span>
            <span><strong>{label}</strong><br /><span style={{ color: 'var(--text-secondary)' }}>{c.detail}</span></span>
          </li>
        ))}
      </ul>
      <p style={{ color: 'var(--text-secondary)' }}>Agenten: {s.agents.join(', ')}</p>
    </div>
  );
}
