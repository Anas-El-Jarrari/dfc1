'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { CircleCheck, CircleHelp, CircleX, ExternalLink, SearchCheck, CircleDot } from 'lucide-react';
import { SourceSeal, type SourceKind } from '@/ui';

export interface Claim {
  claim: string;
  verdict: 'belegt' | 'widerlegt' | 'teilweise' | 'kein_beleg';
  explanation: string;
  sources: { url: string; title: string; name: string; kind: SourceKind }[];
}
export interface FactCheckResult { claims: Claim[]; link?: { url: string; trusted: boolean; name?: string } }

export const VERDICT = {
  belegt: { label: 'Belegt', Icon: CircleCheck, color: 'var(--sage)', bg: 'var(--sage-bg)' },
  widerlegt: { label: 'Widerlegt', Icon: CircleX, color: 'var(--ampel-red)', bg: '#F6E0DA' },
  teilweise: { label: 'Teilweise', Icon: CircleDot, color: 'var(--honey-text)', bg: 'var(--honey-bg)' },
  kein_beleg: { label: 'Kein Beleg', Icon: CircleHelp, color: 'var(--text-secondary)', bg: 'var(--muted)' },
} as const;

export function ClaimCard({ c, index = 0 }: { c: Claim; index?: number }) {
  const v = VERDICT[c.verdict];
  return (
    <motion.article className="card grid gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} data-testid="claim">
      <span className="seal w-fit" style={{ background: v.bg, color: v.color }}><v.Icon size={15} aria-hidden />{v.label}</span>
      <p className="font-bold">{c.claim}</p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.explanation}</p>
      {c.sources.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-semibold min-h-[44px]" style={{ color: 'var(--primary)' }}>
          <SourceSeal kind={s.kind} name={s.name} /><span className="truncate flex-1">{s.title || 'Quelle öffnen'}</span><ExternalLink size={16} aria-hidden />
        </a>
      ))}
    </motion.article>
  );
}

export async function runFactCheck(text: string): Promise<FactCheckResult | { error: string }> {
  const r = await fetch('/api/agents/factcheck', { method: 'POST', body: JSON.stringify({ text }) }).then((x) => x.json()).catch(() => ({ error: 'Keine Verbindung.' }));
  if (r.blocked) return { error: r.message };
  return r;
}

/** Fact check of a draft before sending. Optional: the person decides what to do with the result. */
export function DraftFactCheck({ text }: { text: string }) {
  const [state, setState] = useState<{ busy?: boolean; result?: FactCheckResult; error?: string }>({});
  const run = async () => {
    setState({ busy: true });
    const r = await runFactCheck(text);
    setState('error' in r ? { error: r.error } : { result: r });
  };
  return (
    <div className="grid gap-2">
      {!state.result && (
        <button className="btn-secondary gap-2" onClick={run} disabled={state.busy}>
          <SearchCheck size={18} aria-hidden />{state.busy ? 'Kim prüft Fakten …' : 'Fakten prüfen'}
        </button>
      )}
      {state.error && <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--contra-text)' }}>{state.error}</p>}
      {state.result && (state.result.claims.length
        ? state.result.claims.map((c, i) => <ClaimCard key={c.claim} c={c} index={i} />)
        : <p className="text-sm font-semibold" style={{ color: 'var(--sage)' }}>Keine prüfbaren Tatsachenbehauptungen gefunden.</p>)}
    </div>
  );
}
