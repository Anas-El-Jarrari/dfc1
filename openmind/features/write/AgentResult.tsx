'use client';
import type { ApplicationResult, StageEvent } from '@/core/research/types';
const STEPS = [['intake', 'Anliegen verstehen'], ['research', 'Quellen recherchieren'], ['routing', 'Zuständigkeit und Möglichkeiten'], ['draft', 'Nachricht formulieren'], ['guardian', 'Ethics Guardian']] as const;
export function AgentProgress({ events }: { events: StageEvent[] }) {
  return <div className="card grid gap-3" role="status" aria-live="polite">
    <strong>Kim arbeitet an deinem Anliegen</strong>
    {STEPS.map(([id, label]) => { const event = events.findLast((e) => e.id === id); return <div key={id} className="text-sm flex flex-wrap gap-x-2"><span>{event?.status === 'done' ? '✓' : event ? '●' : '○'} {label}</span><span style={{ color: 'var(--text-secondary)' }}>{event ? event.model : 'Wartet'}</span></div>; })}
  </div>;
}
export function AgentResult({ result }: { result: ApplicationResult }) {
  const { routing: r, guardian: g } = result;
  const source = (ids: number[]) => <span>{ids.map((id) => { const s = result.sources.find((s) => s.id === id); return s ? <a key={id} className="underline ml-2 break-all" href={s.url} target="_blank" rel="noreferrer">Quelle {id} ↗</a> : null; })}</span>;
  const summary = (text: string) => text.length > 150 ? text.slice(0, 147).trimEnd() + '…' : text;
  return <>
    <details className="card">
      <summary className="cursor-pointer list-none grid gap-1"><h2 className="text-xl">Das kannst du tun</h2><p>{summary(r.recommendation)}</p><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Empfehlung und zuständige Stelle ansehen</span></summary>
      <div className="grid gap-2 mt-4"><p>{r.recommendation}</p><p className="text-sm">{source(r.recommendationSourceIds)}</p><p><strong>{r.office.name}</strong> · {r.office.reason}</p><p className="text-sm">{source(r.office.sourceIds)}</p></div>
    </details>
    {r.options.map((option, i) => <details key={i} className="card"><summary className="cursor-pointer list-none grid gap-1"><h3 className="font-bold">{option.title}</h3><p>{summary(option.description)}</p><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Möglichkeit und Abwägung ansehen</span></summary><div className="grid gap-2 mt-4"><p>{option.description}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{option.tradeoff}</p><p className="text-sm">{source(option.sourceIds)}</p></div></details>)}
    {(r.verificationNeeded.length > 0 || !g.pass) && <div className="card grid gap-2" role="alert" style={{ background: 'var(--honey-bg)', color: 'var(--honey-text)' }}><strong>Vor dem Versand klären</strong>{[...r.verificationNeeded, ...g.concerns, ...g.unsupportedClaims, ...g.missingDraftElements].map((s, i) => <p key={i}>{s}</p>)}{!g.pass && <p>Der Guardian hat den Entwurf noch nicht freigegeben. Du kannst ihn bearbeiten und erneut prüfen.</p>}</div>}
    <details className="card"><summary className="cursor-pointer list-none grid gap-1"><strong>Die Gegenseite</strong><p>{summary(g.counterposition || result.draft.counterposition)}</p></summary><p className="mt-4">{g.counterposition || result.draft.counterposition}</p></details>
    {r.requirements.length > 0 && <details className="card"><summary className="font-bold cursor-pointer">Was hilft bei deinem Anliegen? · {r.requirements.length}</summary><div className="grid gap-3 mt-3">{r.requirements.map((item, i) => <div key={i}><strong>{item.title}</strong> · {item.required ? 'Laut Quelle erforderlich' : 'Optional'}<p>{item.detail}</p><p className="text-sm">{source(item.sourceIds)}</p></div>)}</div></details>}
    <details className="card"><summary className="font-bold cursor-pointer">Rechtsgrundlagen und Quellen</summary><div className="grid gap-3 mt-3">{r.laws.length ? r.laws.map((law, i) => <div key={i}><strong>{law.citation}</strong><p>{law.relevance}</p><p className="text-sm">{law.limit}{source(law.sourceIds)}</p></div>) : <p>Keine ausreichend belegte Rechtsgrundlage gefunden. Der Entwurf darf daraus keinen Rechtsanspruch ableiten.</p>}{result.sources.map((s) => <a key={s.id} className="text-sm underline break-words" href={s.url} target="_blank" rel="noreferrer">[{s.id}] {s.title} ↗</a>)}</div></details>
    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Lokales Modell: {result.model} · Ort: {result.location} · Recherchiert {new Date(result.checkedAt).toLocaleString('de-DE')}. Nicht geklärt: {[...result.intake.openQuestions.map((q) => q.question), ...result.research.unknowns].join('; ') || 'Keine offenen Angaben erkannt.'}</p>
  </>;
}

