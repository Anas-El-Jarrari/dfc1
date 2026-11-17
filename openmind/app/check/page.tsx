'use client';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, Link2, SearchCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import KimBase from '@/components/Kim';
import { ClaimCard, runFactCheck, type FactCheckResult } from '@/features/write/FactCheck';
import { KimTip } from '@/ui';

const EXAMPLES = ['Düsseldorf hat mehr Einwohner als Köln.', 'Das Deutschlandticket kostet 2026 63 Euro im Monat.'];

function Check() {
  const initial = useSearchParams().get('text') ?? '';
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FactCheckResult>();
  const [error, setError] = useState('');
  const started = useRef(false);

  const run = async (t = text) => {
    if (t.trim().length < 8) return;
    setBusy(true); setError(''); setResult(undefined);
    const r = await runFactCheck(t);
    setBusy(false);
    if ('error' in r) setError(r.error); else setResult(r);
  };
  useEffect(() => {
    if (initial && !started.current) { started.current = true; run(initial); }
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-4 pt-5 pb-28 grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex items-center gap-2">
        <Link href="/frag-nach" className="icon-btn" aria-label="Zurück zu Kim"><ChevronLeft aria-hidden /></Link>
        <h1 className="text-2xl">Stimmt das?</h1>
      </div>
      <KimTip id="check">Ich prüfe nur gegen geprüfte Quellen. Was ich nicht belegen kann, sage ich auch so.</KimTip>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <textarea aria-label="Behauptung oder Link" rows={4} className="card w-full outline-none" placeholder="Behauptung oder Link einfügen" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-primary gap-2" disabled={busy || text.trim().length < 8}><SearchCheck size={18} aria-hidden />{busy ? 'Kim prüft …' : 'Prüfen'}</button>
      </form>
      {!result && !busy && !error && (
        <div className="flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} className="pill" onClick={() => { setText(e); run(e); }}>{e}</button>)}</div>
      )}
      {busy && <div className="card flex items-center gap-3" role="status"><KimBase pose="search" size={52} /><span className="font-bold">Kim sucht in geprüften Quellen …</span></div>}
      {error && <p role="alert" className="card font-semibold" style={{ color: 'var(--contra-text)', background: 'var(--contra-bg)' }}>{error}</p>}
      {result?.link && (
        <div className="card flex items-center gap-3" style={{ background: result.link.trusted ? 'var(--sage-bg)' : 'var(--contra-bg)' }}>
          {result.link.trusted ? <ShieldCheck aria-hidden style={{ color: 'var(--sage)' }} /> : <ShieldAlert aria-hidden style={{ color: 'var(--contra-text)' }} />}
          <span className="font-semibold flex-1"><Link2 size={14} className="inline mr-1" aria-hidden />{result.link.trusted ? `Geprüfte Quelle: ${result.link.name}` : 'Diese Seite gehört nicht zu unseren geprüften Quellen.'}</span>
        </div>
      )}
      {result && (result.claims.length ? result.claims.map((c, i) => <ClaimCard key={c.claim} c={c} index={i} />) : <p className="card font-semibold">Keine prüfbaren Tatsachenbehauptungen gefunden.</p>)}
    </div>
  );
}

export default function Page() {
  return <Suspense><Check /></Suspense>;
}
