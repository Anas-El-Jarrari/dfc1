'use client';
import { useState } from 'react';
import { Loading } from './ui';

interface Issue { original: string; type: string; explanation: string }

/** Checks a petition or survey text for loaded wording and offers a neutral version. */
export default function NeutralityCheck({ text, onAccept }: { text: string; onAccept: (t: string) => void }) {
  const [res, setRes] = useState<{ issues: Issue[]; neutralVersion: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      setRes(await (await fetch('/api/agents/neutrality', { method: 'POST', body: JSON.stringify({ text }) })).json());
    } finally { setBusy(false); }
  };

  const marked = () => {
    if (!res?.issues.length) return text;
    const re = new RegExp(`(${res.issues.map((i) => i.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return text.split(re).map((part, i) => (i % 2 ? <mark key={i} style={{ background: 'var(--contra-bg)', color: 'var(--contra-text)' }}>{part}</mark> : part));
  };

  return (
    <div className="grid gap-2" data-testid="neutrality">
      <button className="btn-secondary" onClick={run} disabled={!text.trim() || busy}>Neutralität prüfen</button>
      {busy && <Loading text="Kim prüft die Formulierung …" />}
      {res && (
        <div className="card grid gap-2">
          {res.issues.length ? (
            <>
              <p data-testid="neutrality-marked">{marked()}</p>
              <div className="flex flex-wrap gap-1">{res.issues.map((i) => <span key={i.original} className="chip" style={{ background: 'var(--contra-bg)', color: 'var(--contra-text)' }} title={i.explanation}>{i.original}: {i.type}</span>)}</div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Neutraler Vorschlag</p>
              <p className="font-semibold" data-testid="neutral-version">{res.neutralVersion}</p>
              <button className="font-semibold text-left min-h-[44px]" style={{ color: 'var(--primary)' }} onClick={() => { onAccept(res.neutralVersion); setRes(null); }}>Vorschlag übernehmen</button>
            </>
          ) : <span className="chip chip-stadt" data-testid="neutral-ok">Keine Wertung gefunden</span>}
        </div>
      )}
    </div>
  );
}
