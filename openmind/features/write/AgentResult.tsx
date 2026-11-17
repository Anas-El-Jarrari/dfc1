'use client';
import type { ApplicationResult, StageEvent } from '@/core/research/types';
const STEPS = [['intake', 'Anliegen verstehen'], ['research', 'Quellen recherchieren'], ['routing', 'Zuständigkeit und Möglichkeiten'], ['draft', 'Nachricht formulieren'], ['guardian', 'Ethics Guardian'], ['relevance', 'Beteiligungsblick: Relevantes filtern']] as const;
export function AgentProgress({ events }: { events: StageEvent[] }) {
  return <div className="card grid gap-3" role="status" aria-live="polite">
    <strong>Kim arbeitet an deinem Anliegen</strong>
    {STEPS.map(([id, label]) => { const event = events.findLast((e) => e.id === id); return <div key={id} className="text-sm flex flex-wrap gap-x-2"><span>{event?.status === 'done' ? '✓' : event ? '●' : '○'} {label}</span><span style={{ color: 'var(--text-secondary)' }}>{event ? event.model : 'Wartet'}</span></div>; })}
  </div>;
}
export function AgentResult({ result }: { result: ApplicationResult }) {
  const { routing: r, guardian: g } = result;
  const review = result.participationReview;
  const select = <T,>(items: T[], indexes?: number[]) => indexes ? indexes.map((index) => items[index]).filter((item): item is T => item !== undefined) : items;
  const findings = select(result.research.findings, review?.findingIndexes);
  const options = select(r.options, review?.optionIndexes);
  const laws = select(r.laws, review?.lawIndexes);
  const requirements = select(r.requirements, review?.requirementIndexes);
  const verifiedEmails = r.contacts.filter((contact) => contact.kind === 'email');
  const forms = r.contacts.filter((contact) => contact.kind === 'form');
  const source = (ids: number[]) => <span>{ids.map((id) => { const s = result.sources.find((s) => s.id === id); return s ? <a key={id} className="underline ml-2 break-all" href={s.url} target="_blank" rel="noreferrer">Quelle {id} ↗</a> : null; })}</span>;
  const summary = (text: string) => text.length > 150 ? text.slice(0, 147).trimEnd() + '…' : text;
  const relevantSourceIds = new Set([
    ...(review?.sourceIds ?? result.sources.map((item) => item.id)),
    ...r.office.sourceIds, ...r.recommendationSourceIds, ...r.contacts.map((contact) => contact.sourceId),
    ...findings.flatMap((item) => item.sourceIds), ...options.flatMap((item) => item.sourceIds),
    ...laws.flatMap((item) => item.sourceIds), ...requirements.flatMap((item) => item.sourceIds),
  ]);
  const relevantSources = result.sources.filter((item) => relevantSourceIds.has(item.id));
  const candidateCount = result.research.findings.length + r.options.length + r.laws.length + r.requirements.length;
  const selectedCount = findings.length + options.length + laws.length + requirements.length;
  return <>
    <details className="card">
      <summary className="cursor-pointer list-none grid gap-1"><h2 className="text-xl">Das kannst du tun</h2><p>{summary(r.recommendation)}</p><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Empfehlung und zuständige Stelle ansehen</span></summary>
      <div className="grid gap-2 mt-4"><p>{r.recommendation}</p><p className="text-sm">{source(r.recommendationSourceIds)}</p><p><strong>{r.office.name}</strong> · {r.office.reason}</p><p className="text-sm">{source(r.office.sourceIds)}</p></div>
    </details>
    {verifiedEmails.length > 0 && <section className="card grid gap-2" aria-label="Belegter Kontaktweg"><strong>Belegte E-Mail-Adresse</strong>{verifiedEmails.map((contact, i) => { const contactSource = result.sources.find((item) => item.id === contact.sourceId); return <div key={contact.sourceId + ':' + i}><p>{contact.purpose}</p><a className="font-bold underline break-all" href={contactSource?.url || '#'} target="_blank" rel="noreferrer">{contact.value}</a> {source([contact.sourceId])}</div>; })}<p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Diese Adresse wird im Entwurf als Empfänger vorausgefüllt und vor dem Versand erneut geprüft.</p></section>}
    {!verifiedEmails.length && (r.unverifiedContacts?.length ?? 0) > 0 && <details className="card"><summary className="font-bold cursor-pointer">E-Mail-Vorschlag noch nicht belegt</summary><div className="grid gap-2 mt-3">{r.unverifiedContacts?.map((contact, i) => <p key={contact.sourceId + ':' + i}><strong>{contact.value}</strong> · nicht als Empfänger freigegeben {source([contact.sourceId])}</p>)}</div></details>}
    {forms.map((contact, i) => <div className="card grid gap-2" key={contact.sourceId + ':' + i}><strong>Offizieller Kontaktweg</strong><p>{contact.purpose}</p><a className="underline break-all" href={contact.value} target="_blank" rel="noreferrer">Onlineformular öffnen ↗</a>{source([contact.sourceId])}</div>)}
    {findings.length > 0 && <details className="card"><summary className="font-bold cursor-pointer">Was die Recherche für dein Anliegen belegt</summary><div className="grid gap-3 mt-3">{findings.map((finding, i) => <div key={i}><p>{finding.claim}</p><p className="text-sm">{source(finding.sourceIds)}</p></div>)}</div></details>}
    {options.map((option, i) => <details key={i} className="card"><summary className="cursor-pointer list-none grid gap-1"><h3 className="font-bold">{option.title}</h3><p>{summary(option.description)}</p><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Möglichkeit und Abwägung ansehen</span></summary><div className="grid gap-2 mt-4"><p>{option.description}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{option.tradeoff}</p><p className="text-sm">{source(option.sourceIds)}</p></div></details>)}
    {(r.verificationNeeded.length > 0 || !g.pass) && <div className="card grid gap-2" role="alert" style={{ background: 'var(--honey-bg)', color: 'var(--honey-text)' }}><strong>Vor dem Versand klären</strong>{[...r.verificationNeeded, ...g.concerns, ...g.unsupportedClaims, ...g.missingDraftElements].map((s, i) => <p key={i}>{s}</p>)}{!g.pass && <p>Der Guardian hat den Entwurf noch nicht freigegeben. Du kannst ihn bearbeiten und erneut prüfen.</p>}</div>}
    <details className="card"><summary className="cursor-pointer list-none grid gap-1"><strong>Die Gegenseite</strong><p>{summary(g.counterposition || result.draft.counterposition)}</p></summary><p className="mt-4">{g.counterposition || result.draft.counterposition}</p></details>
    {requirements.length > 0 && <details className="card"><summary className="font-bold cursor-pointer">Was hilft bei deinem Anliegen? · {requirements.length}</summary><div className="grid gap-3 mt-3">{requirements.map((item, i) => <div key={i}><strong>{item.title}</strong> · {item.required ? 'Laut Quelle erforderlich' : 'Optional'}<p>{item.detail}</p><p className="text-sm">{source(item.sourceIds)}</p></div>)}</div></details>}
    <details className="card"><summary className="font-bold cursor-pointer">Rechtsgrundlagen und Quellen</summary><div className="grid gap-3 mt-3">{laws.length ? laws.map((law, i) => <div key={i}><strong>{law.citation}</strong><p>{law.relevance}</p><p className="text-sm">{law.limit}{source(law.sourceIds)}</p></div>) : <p>Keine ausreichend belegte Rechtsgrundlage gefunden. Der Entwurf darf daraus keinen Rechtsanspruch ableiten.</p>}{relevantSources.map((s) => <a key={s.id} className="text-sm underline break-words" href={s.url} target="_blank" rel="noreferrer">[{s.id}] {s.title} ↗</a>)}</div></details>
    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Abschließender Beteiligungsblick mit {result.participationReviewModel || result.model}: {selectedCount} von {candidateCount} Recherchepunkten und {relevantSources.length} Quellen sichtbar. Zuständigkeit und belegte Kontakte bleiben erhalten.</p>
    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Lokales Modell: {result.model} · Ort: {result.location} · Recherchiert {new Date(result.checkedAt).toLocaleString('de-DE')}. Nicht geklärt: {[...result.intake.openQuestions.map((q) => q.question), ...result.research.unknowns].join('; ') || 'Keine offenen Angaben erkannt.'}</p>
  </>;
}

